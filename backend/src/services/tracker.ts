import type { Env } from "../types"
import { withRetry, UpstreamHttpError, RetryExhaustedError } from "../lib/retry"

const API_BASE = "https://public-api.tracker.gg/v2/apex/standard"
const API_TIMEOUT = 10000 // 10s

// --- Types matching Tracker.gg API response ---

export interface TrackerProfile {
  platformInfo: {
    platformSlug: string
    platformUserId: string
    platformUserHandle: string
    avatarUrl: string | null
  }
  userInfo: {
    isPremium: boolean
    isVerified: boolean
    isInfluencer: boolean
    countryCode: string | null
  }
  metadata: {
    currentSeason: number
    activeLegend: string
    activeLegendName: string
  }
  segments: TrackerSegment[]
}

interface TrackerSegment {
  type: string // "overview" | "legend" | "weapon"
  attributes?: Record<string, string>
  metadata?: {
    name?: string
    imageUrl?: string
    tallImageUrl?: string
    bgImageUrl?: string
    portraitImageUrl?: string
    legendColor?: string
    isActive?: boolean
  }
  stats: Record<string, TrackerStat>
  expiryDate?: string
}

interface TrackerStat {
  rank: number | null
  percentile: number | null
  displayName: string
  displayCategory: string
  value: number
  displayValue: string
  displayType: string
  metadata?: Record<string, string>
}

// --- The cleaned-up shape we return to the frontend ---

export interface PlayerProfile {
  platform: string
  name: string
  avatarUrl: string | null
  level: number
  rankName: string
  rankIconUrl: string | null
  rankScore: number
  currentSeason: number
  activeLegend: string
  overview: {
    kills: number
    damage: number
    wins: number
    matches?: number
    kdRatio: number | null
    headshots?: number
    headshotRate: number | null
    winRate: number | null
    top5Rate: number | null
    avgSurvivalTime: number | null
  }
  legends: LegendStats[]
}

export interface LegendStats {
  name: string
  color: string
  imageUrl: string | null
  isActive: boolean
  kills: number
  damage: number
  matches: number
  wins: number
  winRate: number | null
  avgDamage: number | null
}

// --- Helpers ---

function findStat(stats: Record<string, TrackerStat>, ...keys: string[]): number | null {
  for (const key of keys) {
    const s = stats[key]
    if (s && typeof s.value === "number") return s.value
  }
  return null
}

function safeDivide(a: number | null, b: number | null): number | null {
  if (a == null || b == null || b === 0) return null
  return Math.round((a / b) * 100) / 100
}

// --- Main export ---

export async function getPlayerProfile(
  platform: string,
  identifier: string,
  env: Env
): Promise<PlayerProfile> {
  const url = `${API_BASE}/profile/${platform}/${encodeURIComponent(identifier)}`

  return withRetry(async (attempt) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT)

    try {
      const res = await fetch(url, {
        headers: {
          "TRN-Api-Key": env.TRACKER_API_KEY,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
        },
        signal: controller.signal,
      })
      clearTimeout(timer)

      if (!res.ok) {
        // 404 is non-retryable — player doesn't exist
        if (res.status === 404) {
          throw new PlayerNotFoundError(platform, identifier)
        }
        // 403 is non-retryable — auth/blocked
        if (res.status === 403) {
          const body = await res.text().catch(() => "")
          throw new UpstreamError(
            `Tracker.gg access denied (403). ` +
            `Possible causes: 1) API key pending approval at tracker.gg/developers; ` +
            `2) API key revoked or expired; ` +
            `3) Cloudflare bot detection blocked the Worker IP. ` +
            `Action: visit https://tracker.gg/developers to check your app status. ` +
            `If key is approved, try regenerating a new key.`
          )
        }
        // 429 and 5xx are retryable
        throw new UpstreamHttpError(
          `Tracker.gg returned ${res.status}`,
          res.status,
        )
      }

      const data: TrackerProfile = await res.json()
      return transformProfile(data, platform)
    } catch (err) {
      clearTimeout(timer)
      // Re-throw custom errors (non-retryable)
      if (err instanceof PlayerNotFoundError || err instanceof UpstreamError) {
        throw err
      }
      // AbortError (timeout) → retryable
      if ((err as Error).name === "AbortError") {
        throw new UpstreamHttpError("Tracker.gg request timed out", 504)
      }
      // Wrap unknown errors as retryable
      if (!(err instanceof UpstreamHttpError)) {
        throw new UpstreamHttpError(
          `Tracker.gg request failed: ${(err as Error).message}`,
          502,
        )
      }
      throw err
    }
  })
  .catch((err) => {
    // Unwrap RetryExhaustedError to the last underlying error
    if (err instanceof RetryExhaustedError) {
      throw new UpstreamError(`Tracker.gg: ${err.lastError}`)
    }
    throw err
  })
}

function transformProfile(raw: TrackerProfile, platform: string): PlayerProfile {
  const overview = raw.segments.find((s) => s.type === "overview")
  const stats = overview?.stats ?? {}

  // Rank info
  const rankScoreStat = stats["rankScore"]
  const rankName = rankScoreStat?.metadata?.rankName ?? "Unknown"
  const rankIcon = rankScoreStat?.metadata?.iconUrl ?? null
  const rankScore = rankScoreStat?.value ?? 0

  // Core stats
  const kills = findStat(stats, "kills") ?? 0
  const damage = findStat(stats, "damage") ?? 0
  const wins = findStat(stats, "wins") ?? 0
  const matches = findStat(stats, "matches", "gamesPlayed")
  const headshots = findStat(stats, "headshots")

  // Calculated
  const kdRatio = findStat(stats, "kdRatio") ?? findStat(stats, "kd", "killsPerMatch") ?? safeDivide(kills, findStat(stats, "deaths"))
  const winRate =
    safeDivide(wins, matches) ??
    (findStat(stats, "winRate") != null ? findStat(stats, "winRate")! / 100 : null)
  const top5Rate = findStat(stats, "top5Rate") ?? findStat(stats, "top5", "top5s") // raw count vs percent
  const avgSurvivalTimeSeconds = findStat(stats, "avgSurvivalTime", "averageSurvivalTime")
  const headshotRate =
    findStat(stats, "headshotRate") ??
    safeDivide(headshots, kills)

  // Legends
  const legends: LegendStats[] = raw.segments
    .filter((s) => s.type === "legend")
    .map((s) => {
      const ls = s.stats
      const lk = findStat(ls, "kills") ?? 0
      const ld = findStat(ls, "damage") ?? 0
      const lm = findStat(ls, "matches", "gamesPlayed") ||
                 findStat(ls, "seasonMatches", "gamesPlayed")
      const lw = findStat(ls, "wins") ?? 0
      return {
        name: s.metadata?.name ?? "Unknown",
        color: s.metadata?.legendColor ?? "#888888",
        imageUrl: s.metadata?.imageUrl ?? null,
        isActive: s.metadata?.isActive ?? false,
        kills: lk,
        damage: ld,
        matches: lm ?? 0,
        wins: lw,
        winRate: safeDivide(lw, lm),
        avgDamage: safeDivide(ld, lm),
      }
    })
    .sort((a, b) => b.kills - a.kills)

  return {
    platform,
    name: raw.platformInfo.platformUserHandle,
    avatarUrl: raw.platformInfo.avatarUrl,
    level: stats["level"]?.value ?? 0,
    rankName,
    rankIconUrl: rankIcon,
    rankScore,
    currentSeason: raw.metadata.currentSeason,
    activeLegend: raw.metadata.activeLegendName,
    overview: {
      kills,
      damage,
      wins,
      matches: matches ?? undefined,
      kdRatio,
      headshots: headshots ?? undefined,
      headshotRate,
      winRate,
      top5Rate,
      avgSurvivalTime: avgSurvivalTimeSeconds,
    },
    legends,
  }
}

// --- Custom errors ---

export class PlayerNotFoundError extends Error {
  constructor(
    public platform: string,
    public name: string
  ) {
    super(`Player not found: ${name} on ${platform}`)
    this.name = "PlayerNotFoundError"
  }
}

export class RateLimitError extends Error {
  constructor(source: string) {
    super(`${source} rate limit exceeded`)
    this.name = "RateLimitError"
  }
}

export class UpstreamError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "UpstreamError"
  }
}

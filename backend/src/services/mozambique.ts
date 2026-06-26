import type { Env } from "../types"
import { withRetry, UpstreamHttpError, RetryExhaustedError } from "../lib/retry"

const API_BASE = "https://api.mozambiquehe.re"
const API_TIMEOUT = 10000

// --- Types matching Mozambique API response ---

interface MozambiqueMapEntry {
  map: string
  code: string
  start: number
  end: number
  readableDate_start: string
  readableDate_end: string
  remainingTimer: string
  remainingSecs: number
  Asset: string
}

interface MozambiqueRotation {
  current: MozambiqueMapEntry | null
  next: MozambiqueMapEntry | null
}

interface MozambiqueMapRotationResponse {
  battle_royale?: MozambiqueRotation
  ranked?: MozambiqueRotation
  ltm?: MozambiqueRotation
  [key: string]: MozambiqueRotation | undefined
}

// --- Clean shape for frontend ---

export interface MapEntry {
  map: string
  code: string
  remainingSecs: number
  remainingTimer: string
  assetUrl: string | null
}

export interface MapRotation {
  battle_royale: { current: MapEntry | null; next: MapEntry | null }
  ranked: { current: MapEntry | null; next: MapEntry | null }
  ltm: { current: MapEntry | null; next: MapEntry | null }
}

// --- Helpers ---

function normalizeEntry(entry: MozambiqueMapEntry | null): MapEntry | null {
  if (!entry) return null
  return {
    map: entry.map,
    code: entry.code,
    remainingSecs: entry.remainingSecs,
    remainingTimer: entry.remainingTimer,
    assetUrl: entry.Asset,
  }
}

function normalizeRotation(rot: MozambiqueRotation | undefined): {
  current: MapEntry | null
  next: MapEntry | null
} {
  return {
    current: normalizeEntry(rot?.current ?? null),
    next: normalizeEntry(rot?.next ?? null),
  }
}

// --- Main export ---

export async function getMapRotation(env: Env): Promise<MapRotation> {
  const url = `${API_BASE}/maprotation?auth=${encodeURIComponent(env.MOZAMBIQUE_API_KEY)}&version=2`

  return withRetry(async (attempt) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT)

    try {
      const res = await fetch(url, {
        signal: controller.signal,
      })
      clearTimeout(timer)

      if (!res.ok) {
        // Try to read error body for actionable messages
        let errorMsg = ""
        try {
          const errBody = await res.json() as { Error?: string; error?: string }
          errorMsg = errBody.Error ?? errBody.error ?? ""
        } catch { /* ignore parse errors */ }
        const fullMsg = errorMsg
          ? `Mozambique: ${errorMsg}`
          : `Mozambique returned ${res.status}`

        // 403 and 429-with-verify-message are non-retryable — auth/account issue
        if (res.status === 403) {
          throw new UpstreamError(fullMsg)
        }
        if (res.status === 429 && errorMsg.toLowerCase().includes("verify")) {
          throw new UpstreamError(fullMsg)
        }
        // Other 429 and 5xx are retryable
        throw new UpstreamHttpError(fullMsg, res.status)
      }

      const data: MozambiqueMapRotationResponse = await res.json()

      return {
        battle_royale: normalizeRotation(data.battle_royale),
        ranked: normalizeRotation(data.ranked),
        ltm: normalizeRotation(data.ltm),
      }
    } catch (err) {
      clearTimeout(timer)
      // Re-throw non-retryable custom errors
      if (err instanceof UpstreamError) {
        throw err
      }
      // AbortError (timeout) → retryable
      if ((err as Error).name === "AbortError") {
        throw new UpstreamHttpError("Mozambique request timed out", 504)
      }
      // Already an UpstreamHttpError → pass through
      if (err instanceof UpstreamHttpError) {
        throw err
      }
      // Wrap unknown errors as retryable
      throw new UpstreamHttpError(
        `Mozambique request failed: ${(err as Error).message}`,
        502,
      )
    }
  })
  .catch((err) => {
    // Unwrap RetryExhaustedError to the last underlying error
    if (err instanceof RetryExhaustedError) {
      throw new UpstreamError(`Mozambique: ${err.lastError}`)
    }
    throw err
  })
}

// ========== Player Profile (bridge endpoint — fallback for Tracker.gg) ==========

interface MozambiquePlayerResponse {
  global?: {
    name?: string
    uid?: number
    avatar?: string
    platform?: string
    level?: number
    toNextLevelPercent?: number
    rank?: {
      rankScore?: number
      rankName?: string
      rankDiv?: number
      rankImg?: string
    }
    internalUpdateCount?: number
    bans?: unknown
    battlepass?: unknown
  }
  legends?: {
    selected?: {
      LegendName?: string
      data?: Array<{ name: string; value: number }>
      gameInfo?: Array<{ err?: string }>
      ImgAssets?: { icon?: string; banner?: string }
    }
    all?: Record<string, MozambiqueLegendData>
  }
  total?: {
    kills?: { value?: number }
    damage?: { value?: number }
    games_played?: { value?: number }
    wins?: { value?: number }
    kd?: { value?: number }
    headshots?: { value?: number }
    top5s?: { value?: number }
    winrate?: { value?: number }
    kills_per_game?: { value?: number }
    damage_per_game?: { value?: number }
  }
  realtime?: {
    currentState?: string
    currentStateAsText?: string
  }
}

interface MozambiqueLegendData {
  data?: Array<{ name: string; value: number }>
  gameInfo?: Array<{ err?: string }>
  ImgAssets?: { icon?: string; banner?: string }
}

function findLegendStat(data: Array<{ name: string; value: number }> | undefined, name: string): number | null {
  if (!data) return null
  const entry = data.find((d) => d.name === name)
  return entry?.value ?? null
}

// Map Mozambique platform to our unified platform codes
function mapMozPlatform(mozPlatform: string | undefined): "origin" | "xbl" | "psn" {
  if (!mozPlatform) return "origin"
  const p = mozPlatform.toUpperCase()
  if (p === "X1" || p === "XBOX") return "xbl"
  if (p === "PS4" || p === "PS5" || p === "PSN") return "psn"
  return "origin"
}

export async function getPlayerProfileMozambique(
  platform: string,
  identifier: string,
  env: Env
): Promise<import("./tracker").PlayerProfile> {
  // Map platform codes for Mozambique API
  const mozPlatform = platform === "xbl" ? "X1" : platform === "psn" ? "PS4" : "PC"
  const url = `${API_BASE}/bridge?version=5&auth=${encodeURIComponent(env.MOZAMBIQUE_API_KEY)}&player=${encodeURIComponent(identifier)}&platform=${mozPlatform}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
    })
    clearTimeout(timer)

    if (res.status === 404) {
      throw new UpstreamError(`Player not found via Mozambique: ${identifier}`)
    }
    if (res.status === 403) {
      throw new UpstreamError(`Mozambique access denied (403). API key may be invalid.`)
    }
    if (!res.ok) {
      // Try to read error body for actionable messages
      let errorMsg = ""
      try {
        const errBody = await res.json() as { Error?: string; error?: string }
        errorMsg = errBody.Error ?? errBody.error ?? ""
      } catch { /* ignore parse errors */ }
      const fullMsg = errorMsg
        ? `Mozambique: ${errorMsg}`
        : `Mozambique returned ${res.status}`
      // 429-with-verify-message is non-retryable
      if (res.status === 429 && errorMsg.toLowerCase().includes("verify")) {
        throw new UpstreamError(fullMsg)
      }
      throw new UpstreamHttpError(fullMsg, res.status)
    }

    const data: MozambiquePlayerResponse = await res.json()

    if (!data.global && !data.total) {
      throw new UpstreamError(`Player not found via Mozambique: ${identifier}`)
    }

    // Transform to our PlayerProfile format
    const g = data.global
    const t = data.total ?? {}
    const legends = data.legends

    const mozPlatform2 = mapMozPlatform(g?.platform)
    const playerName = g?.name ?? identifier
    const level = g?.level ?? 0

    // Rank
    const rankName = g?.rank?.rankName ?? "Unknown"
    const rankScore = g?.rank?.rankScore ?? 0
    const rankIconUrl = g?.rank?.rankImg ?? null

    // Overview
    const kills = t.kills?.value ?? 0
    const damage = t.damage?.value ?? 0
    const wins = t.wins?.value ?? 0
    const matches = t.games_played?.value ?? 0
    const kdRatio = t.kd?.value ?? null
    const headshots = t.headshots?.value ?? 0
    const top5s = t.top5s?.value ?? 0
    const winRate = t.winrate?.value ?? null
    const avgDamagePerGame = t.damage_per_game?.value ?? null

    // Calculated
    const top5Rate = matches > 0 ? top5s / matches : null
    const headshotRate = kills > 0 ? headshots / kills : null

    // Legends
    const legendList: import("./tracker").LegendStats[] = []
    const activeLegendName = legends?.selected?.LegendName

    if (legends?.all) {
      for (const [name, legendData] of Object.entries(legends.all)) {
        const d = legendData.data
        if (!d) continue
        const lk = findLegendStat(d, "kills") ?? 0
        const ld = findLegendStat(d, "damage") ?? 0
        const lm = findLegendStat(d, "games_played") ?? 0
        const lw = findLegendStat(d, "wins") ?? 0
        const lwr = lm > 0 ? lw / lm : null
        const lad = lm > 0 ? ld / lm : null

        legendList.push({
          name,
          color: "#888888",
          imageUrl: legendData.ImgAssets?.icon ?? null,
          isActive: name === activeLegendName,
          kills: lk,
          damage: ld,
          matches: lm,
          wins: lw,
          winRate: lwr,
          avgDamage: lad,
        })
      }
    }
    legendList.sort((a, b) => b.kills - a.kills)

    return {
      platform: mozPlatform2,
      name: playerName,
      avatarUrl: g?.avatar ?? null,
      level,
      rankName,
      rankIconUrl,
      rankScore,
      currentSeason: 0, // Mozambique doesn't provide season
      activeLegend: activeLegendName ?? "",
      overview: {
        kills,
        damage,
        wins,
        matches: matches > 0 ? matches : undefined,
        kdRatio,
        headshots: headshots > 0 ? headshots : undefined,
        headshotRate,
        winRate,
        top5Rate,
        avgSurvivalTime: null, // Mozambique doesn't provide survival time
      },
      legends: legendList,
    }
  } catch (err) {
    clearTimeout(timer)
    if (err instanceof UpstreamError || err instanceof UpstreamHttpError) throw err
    if ((err as Error).name === "AbortError") {
      throw new UpstreamError("Mozambique player request timed out")
    }
    throw new UpstreamError(`Mozambique player request failed: ${(err as Error).message}`)
  }
}

// --- Custom errors ---

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

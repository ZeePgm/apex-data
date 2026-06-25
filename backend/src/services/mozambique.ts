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
  assetUrl: string
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
        // 403 is non-retryable — auth issue
        if (res.status === 403) {
          throw new UpstreamError(`Mozambique access denied (403). API key may be invalid.`)
        }
        // 429 and 5xx are retryable
        throw new UpstreamHttpError(
          `Mozambique returned ${res.status}`,
          res.status,
        )
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

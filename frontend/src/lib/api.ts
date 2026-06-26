import type { PlayerProfile, MapRotation } from "./types"

// Workers 后端（Vercel 后端已不可用）
const BACKENDS = [
  "https://apex-data-api.admitted-tower.workers.dev",    // Cloudflare Workers
]

async function tryFetch(path: string): Promise<Response> {
  const errors: string[] = []
  for (const base of BACKENDS) {
    try {
      const res = await fetch(`${base}${path}`)
      if (res.ok) return res
      // 如果是 502（上游 API 故障），尝试下一个后端
      const body = await res.json().catch(() => ({}))
      errors.push(`${base}: ${res.status} — ${(body as { error?: string }).error ?? "unknown"}`)
    } catch {
      errors.push(`${base}: network error`)
    }
  }
  throw new Error(errors.join(" | "))
}

export async function fetchPlayer(platform: string, name: string): Promise<PlayerProfile> {
  const res = await tryFetch(`/api/player/${platform}/${encodeURIComponent(name)}`)
  return res.json()
}

export async function fetchMapRotation(): Promise<MapRotation> {
  const res = await tryFetch("/api/map-rotation")
  return res.json()
}

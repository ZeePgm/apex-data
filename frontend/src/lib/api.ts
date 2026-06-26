import type { PlayerProfile, MapRotation } from "./types"

// 双后端部署：Vercel 为主（IP 段不同，可能不被 Tracker.gg 拦截），Workers 为备
const BACKENDS = [
  "https://backend-psi-six-18.vercel.app",               // Vercel Serverless（主）
  "https://apex-data-api.admitted-tower.workers.dev",    // Cloudflare Workers（备）
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

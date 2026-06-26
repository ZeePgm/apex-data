import type { PlayerProfile, MapRotation } from "./types"

// Cloudflare Workers 后端地址（永久账户）
// 本地开发时可改为 http://localhost:8787
const API_BASE = "https://apex-data-api.admitted-tower.workers.dev"

export async function fetchPlayer(platform: string, name: string): Promise<PlayerProfile> {
  const res = await fetch(`${API_BASE}/api/player/${platform}/${encodeURIComponent(name)}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `API error: ${res.status}`)
  }
  return res.json()
}

export async function fetchMapRotation(): Promise<MapRotation> {
  const res = await fetch(`${API_BASE}/api/map-rotation`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `API error: ${res.status}`)
  }
  return res.json()
}

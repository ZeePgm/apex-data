import type { PlayerProfile, MapRotation } from "./types"

// Workers 后端
const BACKENDS = [
  "https://apex-data-api.admitted-tower.workers.dev",    // Cloudflare Workers
]

async function tryFetch(path: string): Promise<Response> {
  const errors: string[] = []
  for (const base of BACKENDS) {
    try {
      const res = await fetch(`${base}${path}`)
      if (res.ok) return res
      const body = await res.json().catch(() => ({}))
      const msg = (body as { error?: string }).error ?? `${res.status}`
      // 翻译常见错误为中文提示
      const friendly = msg
        .replace(/Mozambique: You must verify your API account first by linking your Discord account on https:\/\/portal\.apexlegendsapi\.com\/discord-auth/,
          "Mozambique API 未验证：请前往 https://portal.apexlegendsapi.com/discord-auth 绑定 Discord 账号")
        .replace(/Tracker\.gg access denied \(403\)/,
          "Tracker.gg API Key 被拒绝(403)，请前往 tracker.gg/developers 检查 Key 状态")
        .replace(/API key may be invalid/,
          "API Key 可能已失效，请检查并重新申请")
      errors.push(friendly)
    } catch {
      errors.push(`${base}: 网络连接失败`)
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

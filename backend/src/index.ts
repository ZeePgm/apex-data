import { Hono } from "hono"
import { cors } from "hono/cors"
import type { Env } from "./types"
import { getPlayerProfile, PlayerNotFoundError, UpstreamError as TUpstreamError } from "./services/tracker"
import { getMapRotation, getPlayerProfileMozambique, UpstreamError as MUpstreamError } from "./services/mozambique"

const app = new Hono<{ Bindings: Env }>()

// CORS: 允许前端域名访问
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "https://apex-data-rho.vercel.app", "https://apex-data-api.admitted-tower.workers.dev"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
)

// 健康检查
app.get("/", (c) => c.json({ status: "ok", name: "apex-data-api" }))

// ========== In-memory fallback cache ==========
// 因为 Cloudflare KV 需要配置，MVP 阶段先用内存缓存
const memoryCache = new Map<string, { data: unknown; expiresAt: number }>()

async function cachedGet(key: string, ttlSeconds: number, fetchFn: () => Promise<unknown>, c: HonoContext) {
  // Try KV first
  const kv = c.env.API_CACHE
  if (kv) {
    try {
      const cached = await kv.get(key, "json")
      if (cached) {
        c.header("X-Cache", "HIT")
        return cached
      }
    } catch {
      // KV read failed, fall through to fetch
    }
  }

  // Try memory cache
  const mem = memoryCache.get(key)
  if (mem && mem.expiresAt > Date.now()) {
    c.header("X-Cache", "HIT")
    return mem.data
  }

  // Fetch fresh
  const data = await fetchFn()

  // Store in KV
  if (kv) {
    try {
      await kv.put(key, JSON.stringify(data), { expirationTtl: ttlSeconds })
    } catch {
      // KV write failed, continue
    }
  }

  // Store in memory
  memoryCache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 })
  c.header("X-Cache", "MISS")
  return data
}

// Helper type for Hono context in the cachedGet helper
type HonoContext = {
  env: Env
  header: (name: string, value: string) => void
}

// ========== API 路由 ==========
const api = new Hono<{ Bindings: Env }>()

// 地图轮换 — 优雅降级，失败时返回空数据而非 502
api.get("/map-rotation", async (c) => {
  try {
    const data = await cachedGet("map-rotation", 300, () => getMapRotation(c.env), c)
    return c.json(data)
  } catch (err) {
    // Return empty rotation with error info — frontend shows "暂不可用"
    const msg = err instanceof MUpstreamError ? err.message : "Map data temporarily unavailable"
    console.warn("Map rotation failed:", msg)
    return c.json({
      battle_royale: { current: null, next: null },
      ranked: { current: null, next: null },
      ltm: { current: null, next: null },
      _error: msg,
    })
  }
})

// 玩家查询（Tracker.gg 为主，Mozambique 为回退）
api.get("/player/:platform/:name", async (c) => {
  const { platform, name } = c.req.param()

  // Validate platform
  const validPlatforms = ["origin", "xbl", "psn"]
  if (!validPlatforms.includes(platform)) {
    return c.json({ error: "Invalid platform. Use: origin, xbl, or psn" }, 400)
  }

  const cacheKey = `player:${platform}:${name.toLowerCase()}`

  // Try Mozambique first (cached) — provides player stats + map rotation in one API
  try {
    const data = await cachedGet(cacheKey + ":moz", 1800, () => getPlayerProfileMozambique(platform, name, c.env), c)
    c.header("X-Data-Source", "mozambique")
    return c.json(data)
  } catch (mozErr) {
    // If Mozambique fails, try Tracker.gg
    const mozMsg = mozErr instanceof Error ? mozErr.message : String(mozErr)
    try {
      const data = await cachedGet(cacheKey, 1800, () => getPlayerProfile(platform, name, c.env), c)
      c.header("X-Data-Source", "tracker.gg")
      return c.json(data)
    } catch (tErr) {
      const tMsg = tErr instanceof Error ? tErr.message : String(tErr)
      if (tErr instanceof PlayerNotFoundError) {
        return c.json({ error: `Player not found: ${name} on ${platform}` }, 404)
      }
      return c.json({ error: `Both data sources failed. Mozambique: ${mozMsg} | Tracker.gg: ${tMsg}` }, 502)
    }
  }
})

// Debug: 测试 Worker 对外连接能力
app.get("/debug/connectivity", async (c) => {
  const results: Record<string, unknown> = {}
  // Test 1: simple public API
  try {
    const r = await fetch("https://httpbin.org/get?test=1")
    results.httpbin = { ok: r.ok, status: r.status }
  } catch (e) {
    results.httpbin = { error: (e as Error).message }
  }
  // Test 2: Tracker.gg reachable
  try {
    const r = await fetch("https://public-api.tracker.gg/v2/apex/standard/profile/origin/ericzhang", {
      headers: { "TRN-Api-Key": c.env.TRACKER_API_KEY, "Accept": "application/json" },
    })
    results.tracker = { ok: r.ok, status: r.status }
  } catch (e) {
    results.tracker = { error: (e as Error).message }
  }
  // Test 3: Mozambique map rotation
  try {
    const r = await fetch(`https://api.mozambiquehe.re/maprotation?version=2&auth=${c.env.MOZAMBIQUE_API_KEY}`)
    results.mozambique_map = { ok: r.ok, status: r.status }
  } catch (e) {
    results.mozambique_map = { error: (e as Error).message }
  }
  // Test 4: Mozambique bridge (player data)
  try {
    const r = await fetch(`https://api.mozambiquehe.re/bridge?version=5&platform=PC&player=ericzhang&auth=${c.env.MOZAMBIQUE_API_KEY}`)
    results.mozambique_bridge = { ok: r.ok, status: r.status }
  } catch (e) {
    results.mozambique_bridge = { error: (e as Error).message }
  }
  return c.json(results)
})

// 挂载 /api 路由
app.route("/api", api)

export default app

// Vercel Serverless 入口 — 与 Cloudflare Workers 共用同一个 Hono app
// 通过环境变量注入 API Key，而非 wrangler.toml bindings
/// <reference types="node" />
import { handle } from "hono/vercel"
import { Hono } from "hono"
import { cors } from "hono/cors"
import type { Env } from "../src/types"
import { getPlayerProfile, PlayerNotFoundError, UpstreamError as TUpstreamError } from "../src/services/tracker"
import { getMapRotation, getPlayerProfileMozambique, UpstreamError as MUpstreamError } from "../src/services/mozambique"

const app = new Hono()

// CORS
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "https://apex-data-rho.vercel.app", "https://apex-data-api.admitted-tower.workers.dev"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
)

// Vercel 环境变量适配（process.env 而非 c.env）
function getEnv(): Env {
  return {
    TRACKER_API_KEY: process.env.TRACKER_API_KEY ?? "",
    MOZAMBIQUE_API_KEY: process.env.MOZAMBIQUE_API_KEY ?? "",
    API_CACHE: undefined as unknown as KVNamespace, // Vercel 上不用 KV
  }
}

// 健康检查
app.get("/", (c) => c.json({ status: "ok", name: "apex-data-api", platform: "vercel" }))

// ========== In-memory fallback cache ==========
const memoryCache = new Map<string, { data: unknown; expiresAt: number }>()

async function cachedGet(key: string, ttlSeconds: number, fetchFn: () => Promise<unknown>, c: { header: (n: string, v: string) => void }) {
  const mem = memoryCache.get(key)
  if (mem && mem.expiresAt > Date.now()) {
    c.header("X-Cache", "HIT")
    return mem.data
  }
  const data = await fetchFn()
  memoryCache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 })
  c.header("X-Cache", "MISS")
  return data
}

// 地图轮换
app.get("/api/map-rotation", async (c) => {
  try {
    const data = await cachedGet("map-rotation", 300, () => getMapRotation(getEnv()), c)
    return c.json(data)
  } catch (err) {
    if (err instanceof MUpstreamError) {
      return c.json({ error: err.message }, 502)
    }
    return c.json({ error: "Internal server error" }, 500)
  }
})

// 玩家查询（Tracker.gg 为主，Mozambique 为回退）
app.get("/api/player/:platform/:name", async (c) => {
  const { platform, name } = c.req.param()
  const validPlatforms = ["origin", "xbl", "psn"]
  if (!validPlatforms.includes(platform)) {
    return c.json({ error: "Invalid platform. Use: origin, xbl, or psn" }, 400)
  }

  const cacheKey = `player:${platform}:${name.toLowerCase()}`
  const env = getEnv()

  // Try Tracker.gg first
  try {
    const data = await cachedGet(cacheKey, 1800, () => getPlayerProfile(platform, name, env), c)
    c.header("X-Data-Source", "tracker.gg")
    return c.json(data)
  } catch (err) {
    if (err instanceof TUpstreamError) {
      try {
        const data = await cachedGet(cacheKey + ":moz", 1800, () => getPlayerProfileMozambique(platform, name, env), c)
        c.header("X-Data-Source", "mozambique")
        return c.json(data)
      } catch (mozErr) {
        const mozMsg = mozErr instanceof Error ? mozErr.message : String(mozErr)
        return c.json({ error: `Both data sources failed. Tracker.gg: ${err.message} | Mozambique: ${mozMsg}` }, 502)
      }
    }
    if (err instanceof PlayerNotFoundError) {
      return c.json({ error: `Player not found: ${name} on ${platform}` }, 404)
    }
    return c.json({ error: "Internal server error" }, 500)
  }
})

// Debug
app.get("/api/debug/connectivity", async (c) => {
  const env = getEnv()
  const results: Record<string, unknown> = {}
  try {
    const r = await fetch("https://httpbin.org/get?test=1")
    results.httpbin = { ok: r.ok, status: r.status }
  } catch (e) {
    results.httpbin = { error: (e as Error).message }
  }
  try {
    const r = await fetch("https://public-api.tracker.gg/v2/apex/standard/profile/origin/ericzhang", {
      headers: { "TRN-Api-Key": env.TRACKER_API_KEY, "Accept": "application/json" },
    })
    results.tracker = { ok: r.ok, status: r.status }
  } catch (e) {
    results.tracker = { error: (e as Error).message }
  }
  try {
    const r = await fetch(`https://api.mozambiquehe.re/maprotation?version=2&auth=${env.MOZAMBIQUE_API_KEY}`)
    results.mozambique_map = { ok: r.ok, status: r.status }
  } catch (e) {
    results.mozambique_map = { error: (e as Error).message }
  }
  try {
    const r = await fetch(`https://api.mozambiquehe.re/bridge?version=5&platform=PC&player=ericzhang&auth=${env.MOZAMBIQUE_API_KEY}`)
    results.mozambique_bridge = { ok: r.ok, status: r.status }
  } catch (e) {
    results.mozambique_bridge = { error: (e as Error).message }
  }
  return c.json(results)
})

export default handle(app)

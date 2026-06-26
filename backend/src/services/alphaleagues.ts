/**
 * AlphaLeagues API — 免费、无需 API Key 的 Apex 地图轮换数据源
 *
 * 数据来源：https://fn.alphaleagues.com/v2/apex/map/
 * 无需认证，无速率限制（公开 API）
 *
 * 作为 Mozambique API 不可用时的备用地图数据源，
 * 也可作为主数据源（更稳定、零配置）。
 */

import { UpstreamError } from "./mozambique"
import type { MapEntry } from "./mozambique"

const API_BASE = "https://fn.alphaleagues.com/v2/apex"

// --- AlphaLeagues 响应类型 ---

interface ALMapData {
  map: string
  event?: string
  _index?: number
  times: {
    sinceStart: number
    next: number
    remaining: {
      minutes: number
      seconds: number
    }
  }
  ranked?: {
    map: string
    start: number
    end: number
  }
  next?: Array<{
    map: string
    duration: number
    start: string
    timestamp: number
  }>
}

interface ALMapResponse {
  success: boolean
  br?: ALMapData
  arenas?: ALMapData
}

// --- 与 Mozambique 共享的输出类型 ---

export interface MapRotation {
  battle_royale: { current: MapEntry | null; next: MapEntry | null }
  ranked: { current: MapEntry | null; next: MapEntry | null }
  ltm: { current: MapEntry | null; next: MapEntry | null }
}

// --- 工具函数 ---

function toMapEntry(al: ALMapData | undefined): MapEntry | null {
  if (!al || !al.map || al.map === "None") return null
  const remaining = al.times.remaining
  const totalSecs = Math.floor(remaining.minutes * 60 + remaining.seconds)

  // 格式化倒计时字符串
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  let timer = ""
  if (h > 0) timer = `${h}时${m}分${String(s).padStart(2, "0")}秒`
  else if (m > 0) timer = `${m}分${String(s).padStart(2, "0")}秒`
  else timer = `${s}秒`

  return {
    map: al.map,
    code: al.map.toLowerCase().replace(/\s+/g, "_"),
    remainingSecs: totalSecs,
    remainingTimer: timer,
    assetUrl: null, // AlphaLeagues 不提供地图图片
  }
}

function toNextEntry(nextArr: ALMapData["next"]): MapEntry | null {
  if (!nextArr || nextArr.length === 0) return null
  const next = nextArr[0]
  return {
    map: next.map,
    code: next.map.toLowerCase().replace(/\s+/g, "_"),
    remainingSecs: Math.max(0, next.timestamp - Math.floor(Date.now() / 1000)),
    remainingTimer: "", // 前端会通过倒计时计算
    assetUrl: null,
  }
}

// --- 主函数 ---

export async function getMapRotationAlphaLeagues(): Promise<MapRotation> {
  const url = `${API_BASE}/map/`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)

    if (!res.ok) {
      throw new UpstreamError(`AlphaLeagues returned ${res.status}`)
    }

    const data: ALMapResponse = await res.json()

    if (!data.success) {
      throw new UpstreamError("AlphaLeagues API returned success=false")
    }

    // BR → 大逃杀
    // BR ranked (if available) → 排位赛
    // Arenas → 限时模式/Mixtape
    const brCurrent = toMapEntry(data.br)

    // Ranked: 如果 br.ranked 有有效地图就用，否则用 br（同地图）
    let rankedCurrent: MapEntry | null = null
    let rankedNext: MapEntry | null = null
    if (data.br?.ranked && data.br.ranked.map && data.br.ranked.map !== "None") {
      rankedCurrent = {
        map: data.br.ranked.map,
        code: data.br.ranked.map.toLowerCase().replace(/\s+/g, "_"),
        remainingSecs: brCurrent?.remainingSecs ?? 0,
        remainingTimer: brCurrent?.remainingTimer ?? "",
        assetUrl: null,
      }
      rankedNext = toNextEntry(data.br.next)
    } else if (brCurrent) {
      // 排位赛使用相同地图
      rankedCurrent = { ...brCurrent }
      rankedNext = toNextEntry(data.br?.next)
    }

    return {
      battle_royale: {
        current: brCurrent,
        next: toNextEntry(data.br?.next),
      },
      ranked: {
        current: rankedCurrent,
        next: rankedNext,
      },
      ltm: {
        current: toMapEntry(data.arenas),
        next: toNextEntry(data.arenas?.next),
      },
    }
  } catch (err) {
    clearTimeout(timer)
    if (err instanceof UpstreamError) throw err
    if ((err as Error).name === "AbortError") {
      throw new UpstreamError("AlphaLeagues request timed out")
    }
    throw new UpstreamError(`AlphaLeagues request failed: ${(err as Error).message}`)
  }
}

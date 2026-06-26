import { useState, useEffect } from "react"
import { PlayerSearch, type Platform } from "@/components/PlayerSearch"
import { PlayerOverview } from "@/components/PlayerOverview"
import { LegendTable } from "@/components/LegendTable"
import { RankRadarChart } from "@/components/RankRadarChart"
import { MapRotation } from "@/components/MapRotation"
import { AnalysisPanel } from "@/components/AnalysisPanel"
import { fetchPlayer, fetchMapRotation } from "@/lib/api"
import type { PlayerProfile, MapRotation as MapRotationType } from "@/lib/types"
import { Loader2, AlertCircle, MapPin } from "lucide-react"

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; profile: PlayerProfile }
  | { status: "error"; message: string }

type MapState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; data: MapRotationType }
  | { status: "error"; message: string }

function App() {
  const [search, setSearch] = useState<SearchState>({ status: "idle" })
  const [maps, setMaps] = useState<MapState>({ status: "idle" })

  // 加载地图轮换数据
  useEffect(() => {
    let cancelled = false
    async function loadMaps() {
      setMaps({ status: "loading" })
      try {
        const data = await fetchMapRotation()
        if (!cancelled) setMaps({ status: "loaded", data })
      } catch (err) {
        if (!cancelled) setMaps({ status: "error", message: (err as Error).message })
      }
    }
    loadMaps()
    return () => { cancelled = true }
  }, [])

  async function handleSearch(platform: Platform, name: string) {
    setSearch({ status: "loading" })
    try {
      const profile = await fetchPlayer(platform, name)
      setSearch({ status: "success", profile })
    } catch (err) {
      setSearch({ status: "error", message: (err as Error).message })
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <header className="border-b border-neutral-800 px-4 sm:px-6 py-3 sm:py-4">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight">Apex Data</h1>
        <p className="text-xs sm:text-sm text-neutral-400">APEX 玩家数据分析工具</p>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12 space-y-6 sm:space-y-8">
        {/* 地图轮换 — 独立模块，始终可见 */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="size-4 text-red-400" />
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide">
              地图轮换
            </h2>
          </div>

          {maps.status === "loading" && (
            <div className="flex items-center justify-center py-10 text-neutral-500 text-sm">
              <Loader2 className="size-4 animate-spin mr-2" />
              加载地图数据...
            </div>
          )}

          {maps.status === "error" && (
            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-500">
              地图数据暂不可用
            </div>
          )}

          {maps.status === "loaded" && <MapRotation data={maps.data} />}
        </section>

        {/* 搜索区域 */}
        <section>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-1">战绩查询</h2>
            <p className="text-sm text-neutral-400 mb-5">
              输入玩家 ID 和平台，获取详细战绩数据与深度分析
            </p>
            <PlayerSearch
              onSearch={handleSearch}
              loading={search.status === "loading"}
            />
          </div>
        </section>

        {/* 加载状态 */}
        {search.status === "loading" && (
          <div className="flex items-center justify-center py-16 text-neutral-400">
            <Loader2 className="size-5 animate-spin mr-2" />
            正在查询玩家数据...
          </div>
        )}

        {/* 错误状态 */}
        {search.status === "error" && (
          <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <AlertCircle className="size-5 text-red-400 shrink-0" />
            <div>
              <p className="text-sm text-red-400 font-medium">查询失败</p>
              <p className="text-xs text-red-400/70 mt-0.5">{search.message}</p>
            </div>
          </div>
        )}

        {/* 成功 — 玩家数据 */}
        {search.status === "success" && (
          <div className="space-y-6 sm:space-y-8">
            {/* 战绩概览 */}
            <section>
              <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-4">
                战绩概览
              </h3>
              <PlayerOverview profile={search.profile} />
            </section>

            {/* 段位对比雷达图 */}
            <section>
              <RankRadarChart
                overview={search.profile.overview}
                rankName={search.profile.rankName}
              />
            </section>

            {/* 传奇使用数据 */}
            <section>
              <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-4">
                传奇使用数据
              </h3>
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
                <LegendTable legends={search.profile.legends} />
              </div>
            </section>

            {/* 战术分析建议 */}
            <section>
              <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-4">
                战术分析建议
              </h3>
              <AnalysisPanel profile={search.profile} />
            </section>
          </div>
        )}

        {/* 空状态 — 首次访问 */}
        {search.status === "idle" && (
          <div className="text-center py-12 text-neutral-600">
            <p className="text-sm">输入玩家 ID 开始查询</p>
            <p className="text-xs mt-1">支持 PC (Origin)、Xbox、PlayStation 平台</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800 px-4 sm:px-6 py-3 sm:py-4 text-center text-xs text-neutral-600 space-y-1.5">
        <p>Apex Data — 基于 Tracker.gg 数据的非官方 Apex Legends 分析工具</p>
        <p>
          <a
            href="https://github.com/ZeePgm/apex-data/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-500 hover:text-neutral-300 underline underline-offset-2 transition-colors"
          >
            问题反馈 & 功能建议
          </a>
        </p>
      </footer>
    </div>
  )
}

export default App

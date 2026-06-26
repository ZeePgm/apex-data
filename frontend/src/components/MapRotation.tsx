import { useState, useEffect } from "react"
import type { MapRotation as MapRotationType, MapInfo } from "@/lib/types"
import { Clock, ChevronRight } from "lucide-react"

interface MapRotationProps {
  data: MapRotationType
}

type GameMode = "battle_royale" | "ranked" | "ltm"

const MODE_LABELS: Record<GameMode, string> = {
  battle_royale: "大逃杀",
  ranked: "排位赛",
  ltm: "限时模式",
}

function MapCard({ map, label, isNext }: { map: MapInfo; label: string; isNext?: boolean }) {
  return (
    <div className={`flex-1 min-w-0 ${isNext ? "opacity-70" : ""}`}>
      <p className="text-[10px] uppercase tracking-wide text-neutral-500 mb-1">{label}</p>
      {map.assetUrl && (
        <img
          src={map.assetUrl}
          alt={map.map}
          className="w-full h-24 sm:h-32 object-cover rounded-md border border-neutral-700 mb-2"
          loading="lazy"
        />
      )}
      <p className="text-sm font-semibold text-white truncate">{map.map}</p>
      {!isNext && (
        <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1">
          <Clock className="size-3" />
          剩余 {map.remainingTimer}
        </p>
      )}
    </div>
  )
}

export function MapRotation({ data }: MapRotationProps) {
  const modes = Object.keys(data).filter(
    (k) => data[k as GameMode]
  ) as GameMode[]

  const [mode, setMode] = useState<GameMode>(modes[0] ?? "battle_royale")
  const [tick, setTick] = useState(0)

  // 每秒刷新倒计时
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const modeData = data[mode]
  if (!modeData) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-500">
        地图数据暂不可用
      </div>
    )
  }

  const { current, next } = modeData

  // 根据 tick 计算递减后的剩余时间
  function getRemainingTimer(baseSecs: number): string {
    const s = Math.max(0, baseSecs - tick)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}时${m}分${String(sec).padStart(2, "0")}秒`
    if (m > 0) return `${m}分${String(sec).padStart(2, "0")}秒`
    return `${sec}秒`
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
      {/* 模式切换 */}
      <div className="flex border-b border-neutral-800">
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m)
              setTick(0) // 切换模式时重置倒计时
            }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === m
                ? "text-white border-b-2 border-red-500 bg-neutral-800/50"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* 地图展示 */}
      <div className="p-4">
        {/* 当前地图 */}
        <div className="mb-4">
          <MapCard
            map={{ ...current, remainingTimer: getRemainingTimer(current.remainingSecs) }}
            label="当前地图"
          />
        </div>

        {/* 下一张地图 */}
        {next && (
          <div className="border-t border-neutral-800 pt-3">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-neutral-500 mb-2">
              <ChevronRight className="size-3" />
              下一张地图
            </div>
            <div className="flex items-center gap-3">
              {next.assetUrl && (
                <img
                  src={next.assetUrl}
                  alt={next.map}
                  className="w-20 h-14 object-cover rounded border border-neutral-700 shrink-0"
                  loading="lazy"
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{next.map}</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {getRemainingTimer(current.remainingSecs)} 后轮换
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import type { PlayerProfile } from "@/lib/types"
import { StatCard } from "./StatCard"

function fmt(n: number | null | undefined, suffix = ""): string {
  if (n == null) return "—"
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M" + suffix
  if (n >= 10_000) return (n / 1_000).toFixed(0) + "K" + suffix
  return n.toLocaleString() + suffix
}

function pct(n: number | null | undefined): string {
  if (n == null) return "—"
  // If n > 1, treat as raw percentage; otherwise treat as decimal
  const v = n > 1 ? n : n * 100
  return v.toFixed(1) + "%"
}

interface PlayerOverviewProps {
  profile: PlayerProfile
}

export function PlayerOverview({ profile }: PlayerOverviewProps) {
  const { overview, level, rankName, rankScore, activeLegend, avatarUrl, name, currentSeason } = profile

  return (
    <div className="space-y-6">
      {/* 玩家信息头部 */}
      <div className="flex items-center gap-4">
        {avatarUrl && (
          <img
            src={avatarUrl}
            alt={name}
            className="size-12 rounded-full border border-neutral-700"
          />
        )}
        <div>
          <h2 className="text-xl font-bold text-white">{name}</h2>
          <p className="text-sm text-neutral-400">
            S{currentSeason} · 等级 {level} · {rankName}
            {rankScore > 0 && ` (${rankScore.toLocaleString()} RP)`}
          </p>
        </div>
        {activeLegend && (
          <span className="ml-auto rounded-full bg-red-500/10 px-3 py-1 text-xs text-red-400 border border-red-500/20">
            主玩 {activeLegend}
          </span>
        )}
      </div>

      {/* 核心数据卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="段位" value={rankName} highlight />
        <StatCard label="等级" value={level} />
        <StatCard label="K/D" value={overview.kdRatio?.toFixed(2) ?? "—"} />
        <StatCard label="总击杀" value={fmt(overview.kills)} />
        <StatCard label="总伤害" value={fmt(overview.damage)} />
        <StatCard label="胜场" value={fmt(overview.wins)} />
        <StatCard label="胜率" value={pct(overview.winRate)} />
        <StatCard label="Top 5 率" value={pct(overview.top5Rate)} />
        <StatCard label="爆头率" value={pct(overview.headshotRate)} />
        <StatCard
          label="场均存活"
          value={
            overview.avgSurvivalTime != null
              ? Math.floor(overview.avgSurvivalTime / 60) + ":" + String(Math.floor(overview.avgSurvivalTime % 60)).padStart(2, "0")
              : "—"
          }
        />
      </div>
    </div>
  )
}

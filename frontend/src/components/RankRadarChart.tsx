import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts"
import type { PlayerOverview } from "@/lib/types"
import { getBaseline, RADAR_MAX } from "@/data/rankBaselines"

interface RankRadarChartProps {
  overview: PlayerOverview
  rankName: string
}

// 归一化到 0-100 便于雷达图展示
function norm(value: number | null, max: number): number {
  if (value == null || value <= 0) return 0
  return Math.min((value / max) * 100, 100)
}

export function RankRadarChart({ overview, rankName }: RankRadarChartProps) {
  const baseline = getBaseline(rankName)
  const tierLabel = baseline?.rank ?? rankName

  // 将 headshotRate 和 top5Rate 从百分比（如 20.0）转为小数（0.2）
  const playerHr = overview.headshotRate != null
    ? (overview.headshotRate > 1 ? overview.headshotRate / 100 : overview.headshotRate)
    : null
  const playerT5 = overview.top5Rate != null
    ? (overview.top5Rate > 1 ? overview.top5Rate / 100 : overview.top5Rate)
    : null

  const data = [
    {
      metric: "K/D",
      player: norm(overview.kdRatio, RADAR_MAX.kdRatio),
      tierAvg: norm(baseline?.kdRatio ?? 0, RADAR_MAX.kdRatio),
      fullMark: 100,
    },
    {
      metric: "场均伤害",
      player: norm(overview.damage / Math.max((overview.matches ?? 1), 1), RADAR_MAX.avgDamage),
      tierAvg: norm(baseline?.avgDamage ?? 0, RADAR_MAX.avgDamage),
      fullMark: 100,
    },
    {
      metric: "爆头率",
      player: norm(playerHr, RADAR_MAX.headshotRate),
      tierAvg: norm(baseline?.headshotRate ?? 0, RADAR_MAX.headshotRate),
      fullMark: 100,
    },
    {
      metric: "Top 5率",
      player: norm(playerT5, RADAR_MAX.top5Rate),
      tierAvg: norm(baseline?.top5Rate ?? 0, RADAR_MAX.top5Rate),
      fullMark: 100,
    },
    {
      metric: "存活时间",
      player: norm(overview.avgSurvivalTime, RADAR_MAX.avgSurvivalTime),
      tierAvg: norm(baseline?.avgSurvivalTime ?? 0, RADAR_MAX.avgSurvivalTime),
      fullMark: 100,
    },
  ]

  if (!baseline) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-2">
          段位对比
        </h3>
        <p className="text-sm text-neutral-500">
          暂无「{rankName}」段位的基准数据，无法生成雷达图。请联系开发者添加。
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
      <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-1">
        段位对比 · {tierLabel}
      </h3>
      <p className="text-xs text-neutral-500 mb-2">
        你的数据（红色）vs {tierLabel} 段位平均值（灰色）
      </p>
      <div className="w-full aspect-square max-w-md mx-auto">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="#374151" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: "#9CA3AF", fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "#6B7280", fontSize: 10 }}
              tickCount={4}
            />
            <Radar
              name="你的数据"
              dataKey="player"
              stroke="#EF4444"
              fill="#EF4444"
              fillOpacity={0.25}
              strokeWidth={2}
            />
            <Radar
              name={`${tierLabel} 平均`}
              dataKey="tierAvg"
              stroke="#6B7280"
              fill="#6B7280"
              fillOpacity={0.15}
              strokeWidth={2}
              strokeDasharray="4 4"
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              iconType="circle"
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

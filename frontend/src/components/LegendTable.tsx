import type { LegendStats } from "@/lib/types"

function fmt(n: number | null | undefined): string {
  if (n == null) return "—"
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 10_000) return (n / 1_000).toFixed(0) + "K"
  return n.toLocaleString()
}

function pct(n: number | null | undefined): string {
  if (n == null) return "—"
  const v = n > 1 ? n : n * 100
  return v.toFixed(1) + "%"
}

interface LegendTableProps {
  legends: LegendStats[]
}

export function LegendTable({ legends }: LegendTableProps) {
  if (legends.length === 0) {
    return <p className="text-sm text-neutral-500 text-center py-8">暂无传奇使用数据</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-neutral-800 text-neutral-500 text-xs uppercase tracking-wide">
            <th className="py-3 pl-3 font-medium">传奇</th>
            <th className="py-3 px-2 font-medium text-right">击杀</th>
            <th className="py-3 px-2 font-medium text-right">伤害</th>
            <th className="py-3 px-2 font-medium text-right">场次</th>
            <th className="py-3 px-2 font-medium text-right">胜场</th>
            <th className="py-3 px-2 font-medium text-right">胜率</th>
            <th className="py-3 pr-3 font-medium text-right">场均伤害</th>
          </tr>
        </thead>
        <tbody>
          {legends.map((legend) => (
            <tr
              key={legend.name}
              className={`border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors ${
                legend.isActive ? "bg-red-500/5" : ""
              }`}
            >
              <td className="py-3 pl-3">
                <div className="flex items-center gap-3">
                  {legend.imageUrl && (
                    <img
                      src={legend.imageUrl}
                      alt={legend.name}
                      className="size-8 rounded-full"
                    />
                  )}
                  <div>
                    <span className="font-medium text-white">{legend.name}</span>
                    {legend.isActive && (
                      <span className="ml-2 text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                        当前
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="py-3 px-2 text-right tabular-nums text-white">{fmt(legend.kills)}</td>
              <td className="py-3 px-2 text-right tabular-nums text-neutral-300">{fmt(legend.damage)}</td>
              <td className="py-3 px-2 text-right tabular-nums text-neutral-300">{fmt(legend.matches)}</td>
              <td className="py-3 px-2 text-right tabular-nums text-white">{fmt(legend.wins)}</td>
              <td className="py-3 px-2 text-right tabular-nums text-neutral-300">{pct(legend.winRate)}</td>
              <td className="py-3 pr-3 text-right tabular-nums text-white">{fmt(legend.avgDamage)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

import { useMemo } from "react"
import { runAnalysis, type AnalysisResult, type Severity } from "@/lib/ruleEngine"
import type { PlayerProfile } from "@/lib/types"
import { AlertTriangle, Info, Lightbulb, TrendingUp } from "lucide-react"

const severityConfig: Record<Severity, { icon: typeof AlertTriangle; color: string; bg: string; border: string; label: string }> = {
  warning: {
    icon: AlertTriangle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    label: "需改进",
  },
  info: {
    icon: Info,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    label: "建议",
  },
  tip: {
    icon: Lightbulb,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    label: "优势",
  },
}

function AnalysisCard({ result }: { result: AnalysisResult }) {
  const cfg = severityConfig[result.severity]
  const Icon = cfg.icon
  return (
    <div className={`rounded-lg border ${cfg.border} ${cfg.bg} p-4 space-y-2`}>
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${cfg.color} shrink-0`} />
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${cfg.color} ${cfg.bg}`}>
          {cfg.label}
        </span>
        <span className="text-[10px] text-neutral-500 uppercase tracking-wide">
          {result.type}
        </span>
      </div>
      <h4 className="text-sm font-semibold text-white">{result.title}</h4>
      <p className="text-xs text-neutral-400 leading-relaxed">{result.description}</p>
      <div className="flex items-start gap-1.5 pt-1">
        <TrendingUp className="size-3.5 text-neutral-500 shrink-0 mt-0.5" />
        <p className="text-xs text-neutral-300 leading-relaxed">{result.suggestion}</p>
      </div>
    </div>
  )
}

interface AnalysisPanelProps {
  profile: PlayerProfile
}

export function AnalysisPanel({ profile }: AnalysisPanelProps) {
  const results = useMemo(() => runAnalysis(profile), [profile])

  if (results.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-center">
        <p className="text-sm text-neutral-400">暂无特别的分析建议</p>
        <p className="text-xs text-neutral-600 mt-1">
          你的数据在 {profile.rankName} 段位中表现均衡，继续保持！
        </p>
      </div>
    )
  }

  // 按类型分组
  const grouped = results.reduce<Record<string, AnalysisResult[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type}>
          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
            {type}
          </h4>
          <div className="space-y-3">
            {items.map((r) => (
              <AnalysisCard key={r.id} result={r} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

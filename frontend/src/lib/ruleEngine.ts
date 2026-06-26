import type { PlayerProfile } from "@/lib/types"
import { type RankBaseline, getBaseline } from "@/data/rankBaselines"

// ============== 类型定义 ==============

export type Severity = "info" | "warning" | "tip"

export interface AnalysisResult {
  id: string
  type: string // 分类标签：战斗效率 / 生存策略 / 传奇选择 / 账号洞察
  severity: Severity
  title: string
  description: string
  suggestion: string
}

// ============== 规则定义 ==============

type RuleFn = (profile: PlayerProfile, baseline: RankBaseline | undefined) => AnalysisResult | null

// 辅助：将可能为百分比的 rate 转为 0-1 小数
function asFraction(n: number | null): number | null {
  if (n == null) return null
  return n > 1 ? n / 100 : n
}

const rules: { fn: RuleFn; id: string }[] = [
  // ===== 战斗效率 =====
  {
    id: "high-kd-low-wr",
    fn: (p, b) => {
      if (!b) return null
      const wr = asFraction(p.overview.winRate)
      if (p.overview.kdRatio != null && wr != null &&
          p.overview.kdRatio > b.kdRatio * 1.2 &&
          wr < b.top5Rate * 0.8) {
        return {
          id: "high-kd-low-wr",
          type: "战斗效率",
          severity: "warning",
          title: "你在非必要时刻过度交战",
          description: `你的 K/D（${p.overview.kdRatio.toFixed(2)}）高于 ${b.rank} 段位平均（${b.kdRatio.toFixed(2)}），但胜率偏低。这说明你可能在不该打的时候主动交火，导致即使拿到人头也无法吃鸡。`,
          suggestion: "减少中期无意义的主动交战，关注第三圈后的进圈路线和占点优先于收人头。",
        }
      }
      return null
    },
  },
  {
    id: "low-kd",
    fn: (p, b) => {
      if (!b) return null
      const kd = p.overview.kdRatio
      if (kd != null && kd < b.kdRatio * 0.7 && p.level > 100) {
        return {
          id: "low-kd",
          type: "战斗效率",
          severity: "warning",
          title: "对枪效率偏低",
          description: `你的 K/D（${kd.toFixed(2)}）显著低于 ${b.rank} 段位平均（${b.kdRatio.toFixed(2)}），且账号等级已达 ${p.level} 级，基础经验已足够。问题可能出在瞄准精度或对枪决策上。`,
          suggestion: "建议每天在靶场练习 10 分钟跟枪和定位，重点关注掩体利用和 peek 时机。降低主动对枪的比例，优先占据有利地形后再输出。",
        }
      }
      return null
    },
  },
  {
    id: "high-hs",
    fn: (p, b) => {
      if (!b) return null
      const hr = asFraction(p.overview.headshotRate)
      if (hr != null && hr > b.headshotRate * 1.3) {
        return {
          id: "high-hs",
          type: "战斗效率",
          severity: "tip",
          title: "爆头率优秀",
          description: `你的爆头率（${(hr * 100).toFixed(1)}%）远超 ${b.rank} 段位平均（${(b.headshotRate * 100).toFixed(1)}%），说明你的瞄准习惯很好。`,
          suggestion: "继续保持，建议多使用 Wingman、G7、Longbow 等高单发伤害武器来放大你的精准优势。",
        }
      }
      return null
    },
  },

  // ===== 生存策略 =====
  {
    id: "low-survival",
    fn: (p, b) => {
      if (!b) return null
      const st = p.overview.avgSurvivalTime
      if (st != null && st < b.avgSurvivalTime * 0.7) {
        return {
          id: "low-survival",
          type: "生存策略",
          severity: "warning",
          title: "roll 点次数过多",
          description: `你的平均存活时间（${Math.floor(st / 60)}分${Math.floor(st % 60)}秒）远低于 ${b.rank} 段位平均（${Math.floor(b.avgSurvivalTime / 60)}分${Math.floor(b.avgSurvivalTime % 60)}秒）。存活时间过短通常意味着落地就参与混战（roll 点），而不是选择策略性发育。`,
          suggestion: "减少热门落点（如碎片东部、电容器）的直跳次数。尝试选择 1-2 个队伍竞争的中等资源点，搜完基础装备后再主动寻找交战机会。",
        }
      }
      return null
    },
  },
  {
    id: "top5-no-win",
    fn: (p, b) => {
      if (!b) return null
      const t5 = asFraction(p.overview.top5Rate)
      const wr = asFraction(p.overview.winRate)
      if (t5 != null && wr != null &&
          t5 > b.top5Rate * 1.2 &&
          wr < b.top5Rate * 0.8) {
        // Use top5 as proxy for win expectation
        return {
          id: "top5-no-win",
          type: "生存策略",
          severity: "warning",
          title: "决赛圈控图短板",
          description: `你经常进入前 5（Top5 率 ${(t5 * 100).toFixed(1)}%，高于段位平均），但胜率（${(wr * 100).toFixed(1)}%）没有同步提升。问题出在决赛圈（第 4-6 圈）的站位和控图能力——你知道怎么活到后期，但不知道怎么在决赛圈取胜。`,
          suggestion: "进入决赛圈后，优先占据圈内高点或掩体，而非主动索敌。注意枪线交叉和队友火力覆盖区域。观察下一圈缩圈方向，提前 30 秒开始向有利位置转移。",
        }
      }
      return null
    },
  },
  {
    id: "too-passive",
    fn: (p, b) => {
      if (!b) return null
      const st = p.overview.avgSurvivalTime
      const kd = p.overview.kdRatio
      if (st != null && kd != null &&
          st > b.avgSurvivalTime * 1.3 &&
          kd < b.kdRatio * 0.8) {
        return {
          id: "too-passive",
          type: "生存策略",
          severity: "tip",
          title: "打法过于保守",
          description: `你的平均存活时间（${Math.floor(st / 60)}分${Math.floor(st % 60)}秒）很长，但 K/D（${kd.toFixed(2)}）偏低。你善于规避战斗活到后期，但可能在有利局势下也不愿主动出击。`,
          suggestion: "适当增加中期（第 2-3 圈）的主动交战频次。当你有位置优势或人数优势时，果断压上——你会发现在优势局面下主动出击的胜率比被动等待高得多。",
        }
      }
      return null
    },
  },

  // ===== 传奇选择 =====
  {
    id: "recommend-legend",
    fn: (p) => {
      const eligible = p.legends.filter((l) => l.matches >= 20)
      if (eligible.length < 2) return null
      const avgWinRate = eligible.reduce((s, l) => s + (l.winRate ?? 0), 0) / eligible.length
      if (avgWinRate <= 0) return null
      const best = eligible.reduce((a, b) => ((a.winRate ?? 0) > (b.winRate ?? 0) ? a : b))
      const bestWr = best.winRate ?? 0
      if (bestWr > avgWinRate * 1.5 && best.matches >= 20) {
        return {
          id: "recommend-legend",
          type: "传奇选择",
          severity: "tip",
          title: `建议主玩 ${best.name}`,
          description: `你在 ${best.name} 上的胜率（${(bestWr * (bestWr > 1 ? 1 : 100)).toFixed(1)}%）远高于你的传奇平均水平。这个传奇明显更适合你的打法风格。`,
          suggestion: `在排位赛中优先使用 ${best.name}，将其他传奇作为备用。专注 2-3 个传奇可以让你更快提升段位，而不是频繁切换。`,
        }
      }
      return null
    },
  },
  {
    id: "suboptimal-legend",
    fn: (p) => {
      if (p.legends.length < 2) return null
      const active = p.legends.find((l) => l.isActive)
      if (!active || active.matches < 10) return null
      const best = p.legends
        .filter((l) => l.name !== active.name && l.matches >= 10)
        .sort((a, b) => ((b.winRate ?? 0) + (b.avgDamage ?? 0) / 1000) - ((a.winRate ?? 0) + (a.avgDamage ?? 0) / 1000))[0]
      if (!best) return null
      const activeScore = (active.winRate ?? 0) + (active.avgDamage ?? 0) / 1000
      const bestScore = (best.winRate ?? 0) + (best.avgDamage ?? 0) / 1000
      if (bestScore > activeScore * 1.2) {
        return {
          id: "suboptimal-legend",
          type: "传奇选择",
          severity: "info",
          title: `你正在玩的 ${active.name} 可能不是最佳选择`,
          description: `你当前使用 ${active.name}，但 ${best.name} 的胜率和场均伤害综合表现明显更好（${best.name}: ${((best.winRate ?? 0) * (best.winRate ?? 0 > 1 ? 1 : 100)).toFixed(1)}% 胜率 vs ${active.name}: ${((active.winRate ?? 0) * (active.winRate ?? 0 > 1 ? 1 : 100)).toFixed(1)}% 胜率）。`,
          suggestion: `考虑在排位赛中切换回 ${best.name}，或者分析一下为什么 ${active.name} 的数据不如 ${best.name}——是玩法不适配还是对手阵容克制？`,
        }
      }
      return null
    },
  },
  {
    id: "spread-too-thin",
    fn: (p) => {
      if (p.legends.length >= 5) {
        const total = p.legends.reduce((s, l) => s + l.matches, 0)
        const maxMatches = Math.max(...p.legends.map((l) => l.matches))
        if (total > 0 && maxMatches / total < 0.4) {
          return {
            id: "spread-too-thin",
            type: "传奇选择",
            severity: "info",
            title: "传奇池过于分散",
            description: `你使用了 ${p.legends.length} 个不同的传奇，但没有一个的使用率超过 40%。分散的传奇池使得你无法在任何角色上形成肌肉记忆和深度理解。`,
            suggestion: "选择 2-3 个定位互补的传奇（如一个进攻 + 一个防守 + 一个侦察）专注练习，把使用率集中起来。你的段位提升会明显加快。",
          }
        }
      }
      return null
    },
  },

  // ===== 账号洞察 =====
  {
    id: "high-level-low-rank",
    fn: (p) => {
      const lowRanks = ["Bronze", "Silver", "Gold"]
      const isLowRank = lowRanks.some((r) => p.rankName.startsWith(r))
      if (p.level > 300 && isLowRank) {
        return {
          id: "high-level-low-rank",
          type: "账号洞察",
          severity: "warning",
          title: "高等级但段位偏低",
          description: `你的账号等级已达到 ${p.level} 级，但当前段位仍在 ${p.rankName}。这说明你可能在某个环节存在系统性问题，而不是缺乏游戏经验。`,
          suggestion: "建议复盘自己的对局录像，重点关注：1) 死亡原因是否重复；2) 团战中你的角色定位是否明确；3) 沟通和队伍配合是否有改善空间。300+ 级的经验应该足以支撑 Platinum 以上段位。",
        }
      }
      return null
    },
  },
]

// ============== 引擎入口 ==============

export function runAnalysis(profile: PlayerProfile): AnalysisResult[] {
  const baseline = getBaseline(profile.rankName)
  const results: AnalysisResult[] = []

  for (const rule of rules) {
    try {
      const result = rule.fn(profile, baseline)
      if (result) results.push(result)
    } catch {
      // 单条规则失败不影响其他规则
    }
  }

  // 按严重度排序：warning > info > tip
  const order: Record<Severity, number> = { warning: 0, info: 1, tip: 2 }
  results.sort((a, b) => order[a.severity] - order[b.severity])

  return results
}

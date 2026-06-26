// 各段位基准数据（5 维度：K/D、场均伤害、爆头率、Top 5 率、平均存活秒数）
// 数据来源于 ApexLegendsStatus 社区统计 + 经验估算，用于雷达图同段位对比

export interface RankBaseline {
  rank: string
  kdRatio: number
  avgDamage: number
  headshotRate: number // 0-1 小数
  top5Rate: number // 0-1 小数
  avgSurvivalTime: number // 秒
}

export const RANK_BASELINES: RankBaseline[] = [
  {
    rank: "Bronze",
    kdRatio: 0.5,
    avgDamage: 150,
    headshotRate: 0.12,
    top5Rate: 0.10,
    avgSurvivalTime: 420,
  },
  {
    rank: "Silver",
    kdRatio: 0.7,
    avgDamage: 200,
    headshotRate: 0.15,
    top5Rate: 0.18,
    avgSurvivalTime: 540,
  },
  {
    rank: "Gold",
    kdRatio: 0.9,
    avgDamage: 260,
    headshotRate: 0.18,
    top5Rate: 0.25,
    avgSurvivalTime: 660,
  },
  {
    rank: "Platinum",
    kdRatio: 1.2,
    avgDamage: 330,
    headshotRate: 0.20,
    top5Rate: 0.32,
    avgSurvivalTime: 780,
  },
  {
    rank: "Diamond",
    kdRatio: 1.6,
    avgDamage: 420,
    headshotRate: 0.23,
    top5Rate: 0.40,
    avgSurvivalTime: 900,
  },
  {
    rank: "Master",
    kdRatio: 2.1,
    avgDamage: 540,
    headshotRate: 0.26,
    top5Rate: 0.50,
    avgSurvivalTime: 1020,
  },
  {
    rank: "Apex Predator",
    kdRatio: 3.0,
    avgDamage: 700,
    headshotRate: 0.30,
    top5Rate: 0.60,
    avgSurvivalTime: 1080,
  },
]

// 根据段位名称查找基准数据（支持部分匹配，如 "Diamond 3" → Diamond）
export function getBaseline(rankName: string): RankBaseline | undefined {
  return RANK_BASELINES.find((b) => rankName.startsWith(b.rank))
}

// 用于雷达图的归一化最大值（取 Predator 的 1.2 倍作为上界）
export const RADAR_MAX = {
  kdRatio: 3.6,
  avgDamage: 850,
  headshotRate: 0.36,
  top5Rate: 0.72,
  avgSurvivalTime: 1300,
}

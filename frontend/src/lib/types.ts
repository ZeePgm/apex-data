// 匹配后端 API 返回的 PlayerProfile 类型

export interface PlayerOverview {
  kills: number
  damage: number
  wins: number
  matches?: number
  kdRatio: number | null
  headshots?: number
  headshotRate: number | null
  winRate: number | null
  top5Rate: number | null
  avgSurvivalTime: number | null
}

export interface LegendStats {
  name: string
  color: string
  imageUrl: string | null
  isActive: boolean
  kills: number
  damage: number
  matches: number
  wins: number
  winRate: number | null
  avgDamage: number | null
}

export interface PlayerProfile {
  platform: string
  name: string
  avatarUrl: string | null
  level: number
  rankName: string
  rankIconUrl: string | null
  rankScore: number
  currentSeason: number
  activeLegend: string
  overview: PlayerOverview
  legends: LegendStats[]
}

export interface MapInfo {
  map: string
  code: string
  remainingSecs: number
  remainingTimer: string
  assetUrl: string
}

export interface MapRotation {
  battle_royale?: { current: MapInfo; next: MapInfo }
  ranked?: { current: MapInfo; next: MapInfo }
  ltm?: { current: MapInfo; next: MapInfo } | null
}

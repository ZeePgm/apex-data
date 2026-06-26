# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**Apex Data** — Apex Legends 玩家数据分析工具。输入玩家 ID + 平台，返回战绩数据、段位对比雷达图、地图轮换，最终通过规则引擎 + AI 给出战术改进建议。

- 主目录：`apex-data/`
- 状态：Week 1–6 ✅ 全部完成（2026-06-26）
- 文档：[可行实施方案](apex-route-a-implementation-plan.md) | [技术方案](apex-route-a-technical-plan.md)
- 仓库：https://github.com/ZeePgm/apex-data

## 架构

```
前端 (React SPA)               后端 (Hono API)               外部 API
┌────────────────┐            ┌────────────────┐         ┌─────────────┐
│ Vercel 部署     │  REST API  │ Cloudflare      │  fetch  │ Mozambique  │
│ React 19        │ ────────→ │ Workers 部署    │ ──────→ │ (主数据源)  │
│ TailwindCSS v4  │           │ Hono 4.x        │    ┌──→ │ Tracker.gg  │
│ shadcn/ui v4    │           │ TypeScript      │    │    │ (备用数据源)│
└────────────────┘            └────────────────┘    │    └─────────────┘
https://apex-data-             https://apex-data-api.│
rho.vercel.app                 admitted-tower.workers.dev
                                   ┌────────────────┐
                                   │ Vercel 后端     │
                                   │ backend-psi-six │
                                   │ -18.vercel.app  │
                                   └────────────────┘
```

**数据源策略（2026-06-26 更新）：**
- **Mozambique (apexlegendsapi.com)** → 主数据源，提供玩家数据 + 地图轮换
- **Tracker.gg** → 备用数据源，Mozambique 失败时回退
- 前端只连 Workers 后端，Vercel 后端作为备用部署

## 技术栈

| 层 | 技术 | 版本 |
|---|---|---|
| 前端框架 | React + TypeScript | 19.x / 6.x |
| 构建工具 | Vite | 8.x |
| 样式 | TailwindCSS v4 + shadcn/ui v4 | — |
| 图表 | Recharts | 3.x |
| 后端框架 | Hono (Cloudflare Workers) | 4.x |
| 部署 | Vercel（前端）+ Wrangler（后端） | — |

## 关键文件

```
apex-data/
├── frontend/src/
│   ├── App.tsx                        # 主页面（搜索 + 结果展示 + 状态处理）
│   ├── lib/api.ts                     # 后端 API 封装（双数据源 + 中文错误翻译）
│   ├── lib/utils.ts                   # shadcn/ui 工具函数（cn）
│   ├── lib/types.ts                   # 前端类型定义（PlayerProfile 等）
│   ├── lib/ruleEngine.ts              # 规则引擎（10 条分析规则）
│   ├── data/rankBaselines.ts          # 各段位基准数据（5 维度硬编码）
│   ├── components/ui/button.tsx       # shadcn Button 组件
│   ├── components/StatCard.tsx        # 统计卡片组件
│   ├── components/PlayerSearch.tsx    # 搜索框 + 平台切换
│   ├── components/PlayerOverview.tsx  # 玩家数据面板（10 个指标）
│   ├── components/LegendTable.tsx     # 传奇使用数据表格
│   ├── components/RankRadarChart.tsx  # 段位对比雷达图（Recharts）
│   ├── components/MapRotation.tsx     # 地图轮换组件（倒计时 + 模式切换）
│   ├── components/AnalysisPanel.tsx   # 战术分析建议面板
│   ├── index.css                      # TailwindCSS 入口
│   └── main.tsx                       # React 入口
├── frontend/
│   ├── vite.config.ts                 # Vite + Tailwind + @ alias
│   ├── tsconfig.app.json              # TS 配置（@/ → src/*）
│   ├── components.json                # shadcn/ui 配置
│   └── vercel.json                    # Vercel SPA rewrite
├── backend/src/
│   ├── index.ts                       # Workers API 入口：CORS + 双数据源路由 + 缓存
│   ├── types.ts                       # Cloudflare Workers 环境变量类型
│   ├── lib/retry.ts                   # 通用重试工具（指数退避）
│   └── services/
│       ├── tracker.ts                 # Tracker.gg API 封装（备用数据源）
│       └── mozambique.ts              # Mozambique API 封装（主数据源：地图 + 玩家）
├── backend/api/
│   └── index.ts                       # Vercel Serverless 入口（与 Workers 共享逻辑）
├── backend/
│   ├── wrangler.toml                  # Cloudflare Workers 配置
│   ├── vercel.json                    # Vercel 部署配置（esbuild 构建）
│   └── .dev.vars                      # 本地开发环境变量（API Keys，gitignore）
└── promo-materials.md                 # 推广素材（小红书/B站文案）
```

## API 路由

```
GET  /                                    → { status, name }           健康检查
GET  /api/map-rotation                    → 地图轮换数据（失败时返回空数据，不报错）
GET  /api/player/:platform/:name          → 玩家战绩查询（Mozambique 主 → Tracker.gg 备）
GET  /debug/connectivity                  → API 连通性诊断
```

CORS 允许：`localhost:5173`、`apex-data-rho.vercel.app`

## API Key 管理

| Key | 值 | 用途 | 状态 |
|---|---|---|---|
| Mozambique | `df4864ce3a1c5b947ed32867dbb9d43f` | 玩家数据 + 地图轮换（5次/秒） | ⚠️ 需 Discord 验证：https://portal.apexlegendsapi.com/discord-auth |
| Tracker.gg | `98c1a5cf-793f-4932-8c2d-ae73dfa5b0d7` | 玩家数据备用（30次/分钟） | ❌ 403，需去 tracker.gg/developers 检查 Key 状态 |

> ⚠️ API Key 存储在 `wrangler.toml` (Cloudflare 部署) 和 `.dev.vars` (本地开发)。`.dev.vars` 已加入 `.gitignore`，不会提交到公开仓库。

## 开发命令

```powershell
# 前端
cd apex-data/frontend
npm run dev          # 本地开发（localhost:5173）
npm run build        # 生产构建

# 后端
cd apex-data/backend
npx tsc --noEmit     # TypeScript 类型检查
npx wrangler dev     # 本地运行 Workers
npx wrangler deploy  # 部署到 Cloudflare Workers

# 编译 TypeScript → JS（用于 Cloudflare 网页编辑器粘贴 / Vercel 部署）
npx esbuild src/index.ts --bundle --format=esm --platform=browser --outfile=dist/worker.js
npx esbuild api/index.ts --bundle --format=esm --platform=node --outfile=api/index.js --external:@cloudflare/workers-types --external:wrangler
```

## 数据模型

```typescript
// 玩家基础数据
interface PlayerProfile {
  platform: string        // origin / xbl / psn
  name: string
  avatarUrl: string | null
  level: number
  rankName: string        // Bronze/Silver/Gold/Platinum/Diamond/Master/Apex Predator
  rankIconUrl: string | null
  rankScore: number
  currentSeason: number
  activeLegend: string
  overview: {
    kills: number
    damage: number
    wins: number
    matches?: number
    kdRatio: number | null
    headshots?: number
    headshotRate: number | null
    winRate: number | null
    top5Rate: number | null
    avgSurvivalTime: number | null  // Tracker.gg 有，Mozambique 无
  }
  legends: LegendStats[]
}

// 传奇使用数据
interface LegendStats {
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

// 分析结果（规则引擎输出）
interface AnalysisResult {
  id: string
  type: string           // 战斗效率 | 生存策略 | 传奇选择 | 账号洞察
  severity: "info" | "warning" | "tip"
  title: string
  description: string
  suggestion: string
}
```

## 当前进度

| 阶段 | 状态 | 完成日期 |
|---|---|---|
| Week 1：基础设施 | ✅ | 2026-06-25 |
| Week 2：后端 API 层 | ✅ | 2026-06-25 |
| Week 3：前端 — 战绩查询页 | ✅ | 2026-06-25 |
| Week 4：前端 — 雷达图 + 地图轮换 | ✅ | 2026-06-26 |
| Week 5：分析规则引擎 | ✅ | 2026-06-26 |
| Week 6：上线推广 | ✅ | 2026-06-26 |

### 2026-06-26 环境配置 & 优化（额外）

- [x] Git 2.54.0 安装 + SSH 密钥配置 + GitHub 推送
- [x] `.dev.vars` 创建，本地开发环境就绪
- [x] Umami 后台分析占位符（`index.html`，需注册获取 website-id）
- [x] Footer 添加 GitHub Issues 反馈链接
- [x] 数据源优先级调整为 Mozambique 主 → Tracker.gg 备
- [x] 地图轮换失败时优雅降级（返回空数据而非 502）
- [x] Mozambique API 错误消息中文化
- [x] Vercel 后端修复（添加 esbuild 构建命令）
- [x] `.gitignore` 添加 `.dev.vars`、`api/index.js`

## 已知问题

| 问题 | 影响 | 解决方案 |
|---|---|---|
| Mozambique API 需 Discord 验证 | 地图轮换 + 玩家查询不可用 | https://portal.apexlegendsapi.com/discord-auth |
| Tracker.gg API Key 返回 403 | 备用数据源不可用 | https://tracker.gg/developers 检查 Key 状态 |
| Vercel 后端 `backend-psi-six-18` 崩溃 | 备用后端不可用 | 合并了构建修复，需重新部署 |
| Mozambique 不返回 `avgSurvivalTime` | 规则引擎部分规则自动跳过 | 规则引擎已适配 null 值 |

## 旧项目

`index.html` 是之前的待办事项应用（纯前端），与本项目无关，可忽略。

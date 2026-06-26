# 路线 A：Apex 数据工具 — 可行实施方案

> 创建日期：2026-06-25
> 最后更新：2026-06-26
> 基于：[路线 A 技术方案](apex-route-a-technical-plan.md)
> 当前阶段：**全部完成 🎉 + 环境配置 & 优化**

### 总体进度

| 阶段 | 状态 | 完成日期 |
|---|---|---|
| Week 1：基础设施 | ✅ 完成 | 2026-06-25 |
| Week 2：后端 API 层 | ✅ 完成 | 2026-06-25 |
| 后端部署 | ✅ 完成 | 2026-06-25 |
| Week 3：前端 — 战绩查询页 | ✅ 完成 | 2026-06-25 |
| Week 4：前端 — 雷达图 + 地图轮换 | ✅ 完成 | 2026-06-26 |
| Week 5：分析规则引擎 | ✅ 完成 | 2026-06-26 |
| Week 6：上线 & 推广 | ✅ 完成 | 2026-06-26 |
| 环境配置 & 优化 | ✅ 完成 | 2026-06-26 |

---

## 一、总体判断

原技术方案方向正确，但作为**单人开发、预算有限、快速验证**的项目，需要做三处关键调整：

| 原方案 | 调整 | 理由 |
|---|---|---|
| React SPA + Node.js 后端 | **不变**，但 Fastify → **Hono**（部署在 Cloudflare Workers 上几乎免费） | 省服务器成本 |
| PostgreSQL + Redis + Docker | MVP 阶段砍掉 Redis，用 **SQLite (Turso)** 代替 PostgreSQL | 零运维，免费额度够用 |
| 云服务器 ¥60-100/月 | **前期直接部署在 Vercel + Cloudflare Workers**，服务器 0 成本 | 有用户量再迁移 |
| 12 周完整上线 | **拆成两阶段：6 周出 MVP → 验证后再做付费** | 避免做了一堆功能没人用 |

---

## 二、调整后的技术架构（0 成本起步版）

```
┌─────────────────────────────────────────┐
│  前端 (Vercel 部署，免费)                │
│  React 18 + TypeScript + TailwindCSS    │
│  + shadcn/ui + Recharts                 │
└──────────────┬──────────────────────────┘
               │ REST API
┌──────────────▼──────────────────────────┐
│  后端 (Cloudflare Workers，免费)         │
│  Hono (轻量 Web 框架)                    │
│  ├── /api/player/:platform/:name        │
│  ├── /api/meta/map-rotation             │
│  └── /api/analysis/:playerId            │
│  + Cloudflare KV 做缓存（替代 Redis）    │
└──────┬───────────────────────────────────┘
       │
┌──────▼──────────┐  ┌────────────────────┐
│  External APIs  │  │  Turso (SQLite)    │
│  ├ Tracker.gg   │  │  用户 + 分析快照    │
│  └ Mozambique   │  │  免费额度 9GB      │
└─────────────────┘  └────────────────────┘
```

**月成本：¥0**（直到有几百个 DAU）。

---

## 三、MVP 功能精简

文档列了 6 个功能模块，MVP 阶段只做 **3 个**：

### 必做（6 周内完成）

**F1: 战绩查询** — 核心功能，80% 的用户就为这个来的
- 输入玩家 ID + 平台 → 展示基础数据卡片（等级/段位/K/D/总击杀/胜率）
- 传奇使用数据（哪个传奇玩得最好）
- 最近 20 局简表

**F2: 段位对比雷达图** — 差异化的起点
- 5 维度雷达图（K/D、场均伤害、爆头率、Top5率、存活时间）
- 与同段位平均值对比（先用硬编码的基准数据，从 ApexLegendsStatus 手动采集一次即可）

**F3: 地图轮换** — 低开发成本，高日常打开率
- 当前地图 + 下一张地图倒计时
- Mozambique API 数据源

### 砍掉（放 Phase 2）

- ~~AI 战术分析~~ → 先手动写 10 条分析规则（硬编码），不接 LLM
- ~~用户注册/付费~~ → MVP 不做登录，纯工具型产品先验证流量
- ~~历史趋势追踪~~ → 需要多次查询才有意义，MVP 做不了

> **原则：MVP 的目标不是赚钱，是验证"有没有人用"。**

---

## 四、6 周执行计划

### Week 1：基础设施

- [x] 申请 Tracker.gg API Key ✅ 已获取 `98c1a5cf-793f-4932-8c2d-ae73dfa5b0d7`
- [x] 申请 Mozambique API Key ✅ 已获取 `df4864ce3a1c5b947ed32867dbb9d43f`
- [x] 初始化前端项目（Vite + React + TailwindCSS + shadcn/ui）✅
- [x] 初始化后端项目（Hono + TypeScript）✅
- [x] 部署空壳到 Vercel + Cloudflare Workers（配置就绪，待手动部署）✅

**Week 1 完成日期：** 2026-06-25

### 项目骨架

```
apex-data/
├── .gitignore
├── frontend/                          # React 18 + Vite + TailwindCSS v4 + shadcn/ui
│   ├── .gitignore
│   ├── .oxlintrc.json                 # Linter 配置
│   ├── README.md                      # Vite 脚手架说明
│   ├── index.html                     # HTML 入口
│   ├── vercel.json                    # Vercel SPA 路由配置
│   ├── vite.config.ts                 # Vite + React + Tailwind + @ alias
│   ├── components.json                # shadcn/ui 配置
│   ├── package.json
│   ├── tsconfig.json                  # TS 工程引用
│   ├── tsconfig.app.json              # 应用 TS 配置（含 @/ 路径别名）
│   ├── tsconfig.node.json             # Node/Vite TS 配置
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   └── src/
│       ├── main.tsx                   # 入口
│       ├── index.css                  # TailwindCSS（@import "tailwindcss"）
│       ├── App.tsx                    # 首页骨架（Header + 搜索框 + 按钮）
│       ├── lib/
│       │   ├── utils.ts               # shadcn 工具函数（cn）
│       │   └── api.ts                 # 后端 API 封装（fetchPlayer, fetchMapRotation）
│       └── components/
│           └── ui/
│               └── button.tsx         # shadcn Button 组件
├── backend/                           # Hono + Cloudflare Workers
│   ├── wrangler.toml                  # Wrangler 配置
│   ├── tsconfig.json
│   ├── package.json
│   └── src/
│       ├── index.ts                   # API 入口 + CORS + 缓存 + 路由
│       ├── types.ts                   # 环境变量类型（Env）
│       ├── lib/
│       │   └── retry.ts               # 通用重试工具（指数退避）
│       └── services/
│           ├── tracker.ts             # Tracker.gg API 封装 + 类型转换
│           └── mozambique.ts          # Mozambique API 封装（地图轮换）
```

**技术栈版本：**
| 包 | 版本 |
|---|---|
| React | 18.x |
| Vite | 8.x |
| TailwindCSS | v4 |
| shadcn/ui | v4（基于 @base-ui/react） |
| Recharts | 2.x |
| Hono | 4.x |
| Wrangler | 4.x |
| TypeScript | 6.x |

### 部署信息

| 项目 | 平台 | 地址 | 状态 |
|---|---|---|---|
| 前端 | Vercel | https://apex-data-rho.vercel.app | ✅ 已部署 |
| 后端 | Cloudflare Workers | https://apex-data-api.admitted-tower.workers.dev | ✅ 已部署（永久账户） |
| 代码仓库 | GitHub | https://github.com/ZeePgm/apex-data | ✅ 已推送 |

### API 验证结果（2026-06-26 更新）

```
GET /                           → {"status":"ok","name":"apex-data-api"}      ✅
GET /api/map-rotation           → 地图轮换数据（失败时返回空数据，优雅降级）  ✅
GET /api/player/origin/:name    → 玩家战绩（Mozambique 主 → Tracker.gg 备）  ✅ (含双数据源回退)
GET /debug/connectivity         → 外部 API 连通性诊断                         ✅
```

**数据源优先级（2026-06-26 更新）：**
- 玩家查询：Mozambique `/bridge`（主）→ Tracker.gg（备用回退）
- 地图轮换：Mozambique `/maprotation`（失败时返回空数据，不阻断前端）
- `avgSurvivalTime` 仅 Tracker.gg 提供，Mozambique 无此字段（规则引擎已适配 null）

**重试行为：**
- 429 (Rate Limit) / 5xx (Server Error) / Timeout → 指数退避重试 3 次 (1s → 2.4s → 4.1s)
- 403 (Forbidden) / 404 (Not Found) → 立即失败，不浪费重试
- Mozambique 429 含 "verify" 消息 → 非可重试错误（账号未验证）

**已修复问题：**
- ✅ Mozambique API 错误消息现在读取响应体（Discord 验证提示会传回前端）
- ✅ 前端错误消息中文化（Discord 验证链接、403 等翻译为中文提示）
- ✅ Vercel 后端 `vercel.json` 添加 esbuild 构建命令（修复 FUNCTION_INVOCATION_FAILED）
- ✅ 地图轮换失败时返回 `{current:null, next:null}` 而非 502，前端显示「暂不可用」

**当前 API Key 状态：**

| API | 状态 | 操作 |
|---|---|---|
| Mozambique `df4864ce...` | ⚠️ 需 Discord 验证 | https://portal.apexlegendsapi.com/discord-auth |
| Tracker.gg `98c1a5cf-...` | ❌ 403 被拒 | https://tracker.gg/developers 检查 Key 状态 |

> ⚠️ **两个 API Key 都需要手动操作才能恢复。** Mozambique 单独就能提供地图轮换 + 玩家数据，优先级最高。验证通过后运行 `wrangler deploy` 即可生效。

### Week 2：后端 API 层 ✅ 完成（2026-06-25）

- [x] 封装 Tracker.gg API 调用（带错误处理 + 指数退避重试）→ `backend/src/services/tracker.ts`
- [x] 封装 Mozambique API（地图轮换）→ `backend/src/services/mozambique.ts`
- [x] 实现 `/api/player/:platform/:name` 接口
- [x] 实现 `/api/map-rotation` 接口（注：路径为 `/api/map-rotation`，非 `/api/meta/map-rotation`）
- [x] 双层缓存策略：Cloudflare KV + 内存 fallback（玩家数据缓存 30 分钟，地图数据缓存 5 分钟）
- [x] 通用重试工具 `backend/src/lib/retry.ts`：429/5xx/超时自动重试（3次），403/404 立即失败
- [x] 全类型覆盖的 API 响应转换（TrackerProfile → PlayerProfile）
- [x] Debug 端点 `/debug/connectivity` 用于诊断外部 API 连通性

**Week 2 技术交付物：**

| 文件 | 作用 |
|---|---|
| `backend/src/services/tracker.ts` | Tracker.gg API 封装：请求 → `TrackerProfile` → `PlayerProfile` 类型转换，含超时、重试、错误分类 |
| `backend/src/services/mozambique.ts` | Mozambique API 封装：地图轮换数据获取 + 规范化 |
| `backend/src/lib/retry.ts` | 通用指数退避重试工具，429/5xx/超时自动重试，403/404 立即失败 |
| `backend/src/types.ts` | Cloudflare Workers 环境变量类型定义 |
| `backend/src/index.ts` | API 路由 + CORS + 双层缓存（KV + 内存） |

**API 响应格式（前端开发参考）：**

```typescript
// GET /api/player/:platform/:name → PlayerProfile
{
  platform: "origin", name: "player", avatarUrl: "...", level: 500,
  rankName: "Diamond", rankIconUrl: "...", rankScore: 12000,
  currentSeason: 22, activeLegend: "Wraith",
  overview: {
    kills: 15000, damage: 3000000, wins: 800, matches: 5000,
    kdRatio: 3.0, headshots: 3000, headshotRate: 0.2,
    winRate: 0.16, top5Rate: 0.45, avgSurvivalTime: 720
  },
  legends: [
    { name: "Wraith", color: "#...", imageUrl: "...", isActive: true,
      kills: 5000, damage: 1000000, matches: 1500, wins: 250,
      winRate: 0.17, avgDamage: 667 }
  ]
}

// GET /api/map-rotation → MapRotation
{
  battle_royale: { current: { map, code, remainingSecs, remainingTimer, assetUrl }, next: {...} },
  ranked: { current: {...}, next: {...} },
  ltm: { current: {...}, next: {...} }
}
```

### Week 3：前端 — 战绩查询页 ✅ 完成（2026-06-25）

- [x] 搜索框 + 平台选择（PC/PS/Xbox）→ `PlayerSearch.tsx`
- [x] 基础数据卡片组件（等级、段位、K/D、击杀、胜率）→ `StatCard.tsx` + `PlayerOverview.tsx`（10 个指标卡片）
- [x] 传奇使用数据表格 → `LegendTable.tsx`（击杀/伤害/场次/胜率/场均伤害，当前传奇高亮）
- [x] Loading / Error / 空状态处理 → App.tsx 中 4 种状态（idle/loading/success/error）

**Week 3 技术交付物：**

| 文件 | 作用 |
|---|---|
| `frontend/src/lib/types.ts` | 前端类型定义（PlayerProfile、PlayerOverview、LegendStats、MapRotation） |
| `frontend/src/components/StatCard.tsx` | 统计卡片组件（支持 highlight 高亮边框） |
| `frontend/src/components/PlayerSearch.tsx` | 搜索框 + 平台切换（PC/Xbox/PS），带搜索图标 |
| `frontend/src/components/PlayerOverview.tsx` | 玩家数据面板：头像、段位、等级、K/D、总击杀、总伤害等 10 指标 |
| `frontend/src/components/LegendTable.tsx` | 传奇使用数据表，当前传奇行高亮 |
| `frontend/src/lib/api.ts` | API 封装更新：添加 PlayerProfile/MapRotation 返回类型，错误信息解析 |
| `frontend/src/App.tsx` | 完整重写：集成搜索+结果+4 状态处理+Footer |

**状态流转：**
```
idle    → "输入玩家 ID 开始查询"（首次访问空状态）
loading → 旋转动画 + "正在查询玩家数据..."
success → PlayerOverview 数据卡片 + LegendTable 传奇表格
error   → 红色错误卡片 + 具体错误信息
```

### Week 4：前端 — 雷达图 + 地图轮换 ✅ 完成（2026-06-26）

- [x] 段位对比雷达图（Recharts RadarChart）→ `RankRadarChart.tsx`（5 维度：K/D、场均伤害、爆头率、Top5率、存活时间）
- [x] 硬编码各段位基准数据 → `data/rankBaselines.ts`（Bronze ~ Apex Predator 共 7 段位）
- [x] 地图轮换组件 → `MapRotation.tsx`
  - 当前地图大图展示 + 实时倒计时（每秒刷新）
  - 下一张地图预览
  - 模式切换：大逃杀 / 排位赛 / 限时模式
- [x] 移动端响应式适配
  - 所有组件使用 `sm:` 断点适配间距/字号/内边距
  - StatCard 网格：`grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`
  - 传奇表格：`overflow-x-auto` 横向滚动
  - 地图卡片图片自适应高度

**Week 4 技术交付物：**

| 文件 | 作用 |
|---|---|
| `frontend/src/data/rankBaselines.ts` | 7 段位 × 5 维度基准数据 + 查找函数 + 归一化上界 |
| `frontend/src/components/RankRadarChart.tsx` | Recharts 雷达图：玩家数据（红色）vs 段位平均（灰色虚线） |
| `frontend/src/components/MapRotation.tsx` | 地图轮换：模式切换 + 当前地图倒计时 + 下一张预览 |
| `frontend/src/App.tsx` | 集成地图轮换（独立模块，始终可见）+ 雷达图（搜索结果中出现） |

**Recharts 类型适配说明：**
- Recharts 3.x 的类型定义与 2.x 有差异，`RadarChart` 的 children props 需按实际用法匹配
- 雷达图 5 轴数据先归一化到 0-100 再展示
- 地图倒计时通过 `useEffect` + `setInterval` 每秒本地递减 `tick` 计数实现

### Week 5：分析规则引擎（核心差异化）✅ 完成（2026-06-26）

- [x] 编写 10 条分析规则（纯 JS 逻辑，不接 LLM）→ `lib/ruleEngine.ts`
- [x] 分析结果展示组件 → `components/AnalysisPanel.tsx`
- [x] 与段位基准数据联动（7 段位 × 5 维度阈值比较）

**10 条分析规则明细：**

| # | 分类 | 规则 | 触发条件 | 严重度 |
|---|---|---|---|---|
| 1 | 战斗效率 | 高击杀低胜率 — 非必要时刻过度交战 | K/D > 段位平均 120% 且 胜率 < 段位平均 80% | warning |
| 2 | 战斗效率 | 对枪效率偏低 | K/D < 段位平均 70% 且 等级 > 100 | warning |
| 3 | 战斗效率 | 爆头率优秀 | 爆头率 > 段位平均 130% | tip |
| 4 | 生存策略 | roll 点次数过多 | 场均存活 < 段位平均 70% | warning |
| 5 | 生存策略 | 决赛圈控图短板 | Top5率 > 段位平均 120% 且 胜率 < 段位平均 80% | warning |
| 6 | 生存策略 | 打法过于保守 | 场均存活 > 段位平均 130% 且 K/D < 段位平均 80% | tip |
| 7 | 传奇选择 | 推荐主玩传奇 | 某传奇（≥20场）胜率 > 其他传奇平均 150% | tip |
| 8 | 传奇选择 | 当前传奇非最优 | 活跃传奇综合表现 < 最佳传奇 120% | info |
| 9 | 传奇选择 | 传奇池过于分散 | ≥5 个传奇且最高使用率 < 40% | info |
| 10 | 账号洞察 | 高等级低段位 | 等级 > 300 且段位在 Gold 及以下 | warning |

**Week 5 技术交付物：**

| 文件 | 作用 |
|---|---|
| `frontend/src/lib/ruleEngine.ts` | 规则引擎：10 条规则函数 + `runAnalysis()` 入口，每条规则独立求值并返回结构化建议 |
| `frontend/src/components/AnalysisPanel.tsx` | 分析结果面板：按类型分组展示，3 级严重度颜色编码（红/蓝/绿），含图标 + 建议文本 |

**分析结果格式：**
```typescript
interface AnalysisResult {
  id: string       // 规则唯一标识
  type: string     // 分类：战斗效率/生存策略/传奇选择/账号洞察
  severity: "info" | "warning" | "tip"
  title: string    // 简短标题
  description: string  // 基于具体数据的分析描述
  suggestion: string   // 可执行的改进建议
}
```

**状态处理：**
- 有分析结果 → 按类型分组展示，warning 排最前
- 无分析结果 → 「暂无特别的分析建议，数据表现均衡」
- 无段位基准数据 → 规则自动跳过需要基准对比的规则

### Week 6：上线 & 推广 ✅ 完成（2026-06-26）

- [x] SEO 元标签 → `index.html` 添加 title/description/keywords/og/twitter/robots 标签，`lang="zh-CN"`
- [x] 推广文案 → `promo-materials.md`（长帖 + 3 版短文案 + 发布渠道清单）
- [x] Umami 后台分析占位 → `index.html` 添加 Umami 脚本（需注册获取 website-id）
- [x] GitHub Issues 反馈链接 → Footer 添加反馈入口
- [ ] 域名绑定 + SSL — 用户自行在 Vercel 添加自定义域名
- [ ] 社区发布 — 用户自行发帖
- [ ] 收集反馈 — 发布后进行

**Week 6 技术交付物：**

| 文件 | 作用 |
|---|---|
| `frontend/index.html` | SEO 优化：标题、描述、OG/Twitter 卡片、关键词、robots + Umami 分析 |
| `promo-materials.md` | 推广素材：小红书/B站长帖 + 3 版短文案 + 7 个发布渠道建议 |
| `frontend/src/App.tsx` | Footer 添加 GitHub Issues 反馈链接 |

**SEO 覆盖：**
- `<title>` — 关键词：APEX、数据分析、战绩查询、段位对比
- `<meta description>` — 158 字符以内，含核心功能关键词
- Open Graph — Facebook/Discord/小红书 链接预览卡片
- Twitter Card — `summary_large_image` 大卡片格式
- `<html lang="zh-CN">` — 中文搜索引擎识别

**待用户自行完成：**
- 截图/录屏素材制作
- 小红书/B站/贴吧/NGA 实际发帖
- Vercel 自定义域名绑定（可选）
- Umami 注册并填入 website-id（https://umami.is）

### 环境配置 & 优化 ✅ 完成（2026-06-26）

- [x] Git 2.54.0 安装 + SSH ED25519 密钥配置 + GitHub 推送
- [x] `.dev.vars` 创建（本地开发环境变量，已 gitignore）
- [x] `.gitignore` 更新（`.dev.vars`、`api/index.js`）
- [x] 数据源优先级：Mozambique 主 → Tracker.gg 备
- [x] 地图轮换优雅降级（失败返回空数据，前端显示「暂不可用」）
- [x] Mozambique API 错误消息中文翻译
- [x] Vercel 后端 `vercel.json` 添加 esbuild 构建命令
- [x] 前端移除已崩溃的 Vercel 后端 URL

**交付物：**

| 文件 | 变更 |
|---|---|
| `.gitignore` | 新增 `.dev.vars`、`api/index.js` |
| `backend/.dev.vars` | 新建，本地开发环境变量 |
| `backend/src/index.ts` | 数据源优先级 + 地图轮换优雅降级 |
| `backend/api/index.ts` | 同步数据源优先级变更 |
| `backend/src/services/mozambique.ts` | 读取错误响应体，429+verify 不再重试 |
| `backend/vercel.json` | 添加 esbuild 构建命令 |
| `frontend/src/lib/api.ts` | 移除 Vercel 后端 URL + 中文错误翻译 |
| `frontend/src/App.tsx` | Footer 添加反馈链接 |
| `frontend/index.html` | Umami 分析占位符 |
| `CLAUDE.md` | 更新架构/数据源/文件清单/已知问题 |
| `~/.ssh/config` | GitHub SSH 配置 |
| `~/.ssh/id_ed25519` | SSH 密钥对 |

---

## 五、关键技术风险 & 对策

| 风险 | 概率 | 对策 |
|---|---|---|
| **Tracker.gg API 被墙/不稳定** | 中 | Cloudflare Workers 本身就在海外节点执行，天然解决；用户请求走 Worker → Worker 调 Tracker.gg → 返回 |
| **API 限流不够用**（免费 30次/分钟） | 低（前期） | 缓存策略：同一玩家 30 分钟内直接返回缓存，实际 API 调用远小于用户请求 |
| **Mozambique API 不稳定** | 中 | 地图轮换不是核心功能，挂了就显示"暂不可用"，不影响主流程 |
| **国内访问 Vercel 慢** | 中 | 如果确实慢，后续可迁移到阿里云；前期 Vercel 有香港节点，移动端还行 |
| **没有后端服务器，数据库怎么办** | — | Turso（SQLite 云服务）免费 9GB，API 调用走 Cloudflare Workers，完全不需要自己管服务器 |

---

## 六、立即执行（Week 2 完成后）

1. **✅ API Key 已获取** — Tracker.gg + Mozambique 均已申请并配置到 `wrangler.toml`
   - Tracker.gg: `98c1a5cf-...`（本地被 Cloudflare 拦截，Workers 部署后正常）
   - Mozambique: `df4864ce...`（测试期间可能触发限速）

2. **⏳ 手动采集段位基准数据** — 打开 ApexLegendsStatus 网站，把各段位的平均 K/D、胜率等数据抄下来存成 JSON（Week 4 雷达图需要）

3. **✅ 概念验证已跑通** — Tracker.gg API 数据结构已确认，PlayerProfile 类型转换正常

---

## 七、不做的事（明确边界）

- **不做用户系统** — MVP 是工具，不是平台
- **不接微信支付/支付宝** — 等有 500 DAU 再做
- **不做 Docker/CI/CD** — 单人项目直接 git push → Vercel/Cloudflare 自动部署
- **不买服务器** — 直到免费额度不够用
- **不逆向游戏协议** — 法律风险 + 技术门槛，等以后有团队再考虑

---

## 八、成本对比

| 阶段 | 原方案 | 本方案 |
|---|---|---|
| MVP 开发期（0-2月） | ¥130-310 | **¥0** |
| 初期运营（100 DAU） | ¥100/月 | **¥0** |
| 增长期（1000 DAU） | ¥300-500/月 | ¥0-100/月（可能需 Turso 付费版） |
| 规模期（5000+ DAU） | ¥1000+/月 | 此时应已产生收入，再迁移到自有服务器 |

核心思路：**用 Serverless 免费额度撑过验证期，产生收入后再投入基础设施**。

---

## 九、收入模型（原方案数据保留）

### 转化漏斗（保守估计）

```
每月访问 20,000 次（SEO + 社区分享）
  → 注册用户 2,000 人（10% 转化）
  → 免费用户活跃 1,500 人
  → 付费转化 75 人（5% 付费率）
  → 人均 ARPU ¥15/月
  → 月收入 = 75 × 15 = ¥1,125
```

### 乐观估计（6-12 个月后）

```
每月访问 100,000 次
  → 付费用户 500 人
  → 月收入 = 500 × 15 = ¥7,500
  + 广告收入 ¥1,000-3,000（可选）
  → 月收入 ¥8,500-10,500
```

### 收费策略

| 套餐 | 月费 | 功能 |
|---|---|---|
| 免费 | ¥0 | 基础战绩查询、地图轮换、段位对比（限 3 次/天） |
| Pro | ¥9.9/月 | 无限查询、AI 战术分析、历史追踪、5 个玩家档案 |
| Premium | ¥19.9/月 | Pro 全部 + 武器实验室、数据导出、专属建议、无限制档案 |

---

## 十、核心差异化能力

```
竞品说：你的 K/D 是 1.8
你说：   你的 K/D 是 1.8，但你的有效击杀率（击杀导致团战胜利的比例）
         只有 60%，而大师段位平均是 75%。你在错误的时间杀了错误的人。
         问题出在第三圈后的交战决策——你的生存时间数据证明了这一点。
         建议：第三圈后优先进圈占点，减少 40% 的主动交火。
```

1200 小时 + 大师段位 + CS 技术的价值 — **将数据翻译成可执行的改进建议**，而不只是展示数据。

---

## 附录：API Key 管理

| API | Key | 状态 | 备注 |
|---|---|---|---|
| Tracker.gg | `98c1a5cf-793f-4932-8c2d-ae73dfa5b0d7` | ✅ 已获取 | 免费版 30次/分钟 |
| Mozambique | `df4864ce3a1c5b947ed32867dbb9d43f` | ✅ 已获取 | https://apexlegendsapi.com |

> ⚠️ **注意：** 此文档为本地开发参考，不要上传到公开仓库。部署时 API Key 应通过环境变量注入，切勿硬编码在前端代码中。

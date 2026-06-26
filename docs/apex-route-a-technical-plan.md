# 路线 A：Apex 数据工具 — 详细技术方案 & API 调研

> 创建日期：2026-06-20
> 参见：[路线 A 概要](apex-side-business-analysis.md#路线-aapex-数据工具网站推荐首选)

---

## 一、API 调研详析

### 1.1 可用 API 全景

Apex Legends **没有 Respawn/EA 官方公开 API**，所有数据源均为社区维护。目前主要有 3 个可用 API：

---

#### API ①：Tracker.gg Public API（推荐首选）

| 维度 | 详情 |
|---|---|
| **地址** | `https://public-api.tracker.gg/apex/v1/standard/profile/{PLATFORM}/{NAME}` |
| **文档** | https://apex.tracker.gg/site-api |
| **认证** | 免费申请 API Key，Header 传递 |
| **速率限制** | 30 次 / 60 秒（免费版） |
| **平台支持** | `origin` (PC/EA), `xbl` (Xbox), `psn` (PlayStation) |

**核心端点：**

```
# 1. 玩家搜索
GET /v2/apex/standard/search?query={playerName}&platform={platform}

# 2. 生涯总览（全赛季汇总）
GET /v2/apex/standard/profile/{platform}/{identifier}
→ 返回: level, kills, damage, wins, kdRatio, 各赛季段位等

# 3. 按维度细分统计（传奇/武器等）
GET /v2/apex/standard/profile/{platform}/{identifier}/segments/legend
→ 返回: 每个传奇的击杀、胜率、伤害、爆头率等

# 4. 对局历史（按 session 分组）
GET /v2/apex/standard/profile/{platform}/{identifier}/sessions
→ 返回: 每局的地图、传奇、击杀、排名、伤害、队友等
```

**优点：**
- 文档完善、响应格式规范、JSON Schema 清晰
- 免费额度够 MVP 阶段使用（30次/分钟 = 43200次/天）
- 数据字段丰富：传奇、武器、地图、段位、赛季

**缺点：**
- **明确禁止商用**（non-commercial only），商业化后可能需要谈企业授权
- 国内访问可能需代理（服务器在海外）

---

#### API ②：Mozambiquehere API（备选/补充）

| 维度 | 详情 |
|---|---|
| **地址** | `https://api.mozambiquehe.re` |
| **文档** | https://apexlegendsapi.com |
| **认证** | 免费 API Key |
| **速率限制** | 更严格，部分端点需白名单 |

**核心端点：**

```
# 1. 名称 → UID 解析（支持跨平台）
GET /nametouid?player={name}&platform={PC/X1/PS4/SWITCH}

# 2. 玩家基础统计
GET /bridge?player={uid}&platform={PC}&auth={API_KEY}

# 3. 地图轮换（当前及24小时内的地图）
GET /maprotation?auth={API_KEY}

# 4. 猎杀排行榜
GET /predator?auth={API_KEY}

# 5. 对局历史（需白名单，严格限速：5条/小时）
GET /bridge?player={uid}&platform={PC}&auth={API_KEY}&history=1
```

**优点：**
- 唯一提供**实时地图轮换**的 API
- 支持 Switch 平台
- 名称→UID 解析比 Tracker.gg 更稳定

**缺点：**
- 文档较简陋，响应格式偶有变更
- 对局历史端点几乎不可用（5条/小时的限制）
- 稳定性略低于 Tracker.gg

---

#### API ③：ApexLegendsStatus.com（元数据/赛事）

| 维度 | 详情 |
|---|---|
| **适用** | 传奇选取率、胜率、服务器状态、赛事数据 |
| **状态** | 主要为前端展示，API 在开发中 |
| **用途** | 爬取元数据做本地缓存，丰富分析维度 |

**可获取的独特数据：**
- 各传奇的**选取率 & 胜率**（全服统计，非个人数据）
- 武器使用率排名
- 各地图 POI 热度

**获取方式：** 目前只能通过爬虫定时抓取，或等官方 API 推出

---

### 1.2 API 选型决策

```
MVP 阶段（0-3 月）：
  ├── 主力：Tracker.gg API（玩家数据查询）
  ├── 辅助：Mozambique API（地图轮换 + UID 解析）
  └── 爬虫：ApexLegendsStatus（全服元数据，每周抓一次）

增长阶段（3-6 月）：
  ├── 对接 Tracker.gg 企业版（若用户量上来）
  ├── 自建数据库不再全量实时查 API
  └── 考虑逆向游戏协议做独立数据源（技术门槛高，长期目标）
```

---

## 二、竞品分析

### 2.1 国际竞品

| 产品 | 定位 | 核心功能 | 弱点 |
|---|---|---|---|
| **apex.tracker.gg** | 全球最⼤ Apex 数据站 | 生涯统计、段位、武器数据、Overwolf 游戏内覆盖层 | 数据展示为主，缺少"分析"和"建议" |
| **apexlegendsstatus.com** | 元数据/赛事分析 | 传奇选取率/胜率、武器使用率、地图热度 | 不做个人数据分析 |
| **pley.gg** | 轻量查询 | 服务器状态、地图轮换 | 功能单一 |

### 2.2 国内竞品

| 产品 | 定位 | 核心功能 | 弱点 |
|---|---|---|---|
| **小黑盒 Apex 战绩** | 社交+数据 | 基础战绩查询、段位、生涯数据 | 数据浅，不做深度分析 |
| **op.gg Apex** | 韩国老牌 | 基础战绩、段位、近期对局 | 无中文优化，加载慢 |
| **百度贴吧/QQ群查战绩** | 社群互助 | 依赖人工或第三方 Bot | 无产品化 |

### 2.3 市场空白 & 你的机会

没有一个产品做到 **"告诉你数据背后的含义"**：

| 现有产品做 | 你要做 |
|---|---|
| 显示 K/D = 2.3 | 告诉用户：你的 K/D 比同段位平均高 30%，但你的团战胜率只有 40%，说明你在非必要时刻过度交战 |
| 显示段位历史 | 告诉用户：你这赛季卡在钻石 3，问题出在**落点存活率**远低于钻 3 平均水平 |
| 显示常用传奇 | 分析：你玩机器人时胜率 60% 但恶灵只有 30%，建议主玩机器人，并减少无位移传奇使用 |

**核心壁垒：用 1200 小时 + 单排大师的游戏理解，将数据翻译成战术建议。**

---

## 三、技术架构设计

### 3.1 整体架构

```
┌────────────────────────────────────────────────────┐
│                    前端 (SPA)                        │
│  React 18 + TypeScript + TailwindCSS               │
│  ├── 战绩查询页                                     │
│  ├── 深度分析 Dashboard                              │
│  ├── 地图轮换展示                                    │
│  └── 个人付费中心                                    │
└──────────────┬─────────────────────────────────────┘
               │ REST API / GraphQL
┌──────────────▼─────────────────────────────────────┐
│                  后端 API Server                     │
│  Node.js (Express/Fastify) + TypeScript             │
│  ├── /api/player/:platform/:name  查询玩家          │
│  ├── /api/analysis/:playerId      深度分析          │
│  ├── /api/meta/map-rotation       地图轮换          │
│  ├── /api/meta/legends            传奇元数据        │
│  ├── /api/auth/*                  用户认证           │
│  └── /api/payment/*               付费接口           │
└──────┬──────────┬──────────────┬───────────────────┘
       │          │              │
┌──────▼──┐ ┌─────▼────┐ ┌──────▼──────────┐
│ PostgreSQL│ │  Redis   │ │  External APIs  │
│ (主库)   │ │ (缓存)    │ │  ├ Tracker.gg   │
│ 用户     │ │ API响应   │ │  ├ Mozambique   │
│ 分析结果 │ │ Session   │ │  └ 爬虫数据     │
│ 缓存数据 │ │ 限流      │ │                 │
└─────────┘ └──────────┘ └─────────────────┘
```

### 3.2 技术栈选型

| 层 | 技术 | 理由 |
|---|---|---|
| **前端框架** | React 18 + TypeScript | 生态最大、适合数据可视化、你学 CS 即学即用 |
| **样式** | TailwindCSS + shadcn/ui | 快速出好看 UI，组件库成熟 |
| **图表** | Recharts / ECharts | ECharts 对中文用户更友好 |
| **后端** | Node.js (Fastify) | 高性能、TS 支持好、前后端统一语言 |
| **数据库** | PostgreSQL 16 | JSON 字段存 API 原始响应、关系数据存分析结果 |
| **缓存** | Redis | API 响应缓存、Session、限流 |
| **部署** | Docker + 国内云服务器 | 阿里云/腾讯云 2c4g 起步 |
| **代理** | Nginx 反向代理 + 海外代理转发 | 解决 Tracker.gg API 国内访问问题 |

### 3.3 为什么不用 Python 后端

Python (Django/FastAPI) 也可以，但 Node.js 的好处：
- 前后端统一 TS 类型定义，减少类型不一致 bug
- 异步 I/O 对 API 代理转发场景性能更好
- 你已学 CS，JS/TS 是必备技能，一举两得

---

## 四、核心功能模块设计

### 4.1 MVP 功能（第 1-2 月）

#### F1：战绩查询
```
输入：玩家 ID + 平台（PC/PS/Xbox）
输出：
  ├── 基础信息：等级、段位、总击杀、总伤害、K/D、胜率
  ├── 赛季数据：当前赛季段位历史曲线
  ├── 传奇数据：各传奇使用次数、胜率、K/D、场均伤害
  └── 近期对局：最近 20 局简表（地图、传奇、排名、击杀）
```

#### F2：地图轮换
```
实时展示当前及未来 24 小时的大逃杀/竞技场地图轮换
数据源：Mozambique API
```

#### F3：段位对比
```
将玩家数据与同段位平均水平对比，用雷达图展示：
  ├── 击杀/死亡比
  ├── 场均伤害
  ├── 爆头率
  ├── 胜率 / Top5 率
  └── 场均存活时间
```

### 4.2 付费功能（第 3-4 月）

#### F4：AI 战术分析（核心付费功能）
```
基于你的游戏理解编写的分析规则引擎 + LLM 总结：

输入：用户最近 20 局数据
分析维度：
  ├── 落点分析：哪个 POI 存活率最高？落地战赢率？
  ├── 武器效率：用哪种武器组合时胜率最高？
  ├── 团队分析：跟什么类型的队友搭配效果最好？
  │   （如果 Tracker.gg 提供队友 ID）
  ├── 死亡复盘模式：最常见的死亡原因
  │   （圈外死？被偷？正面刚枪输？）
  └── 改进建议：基于以上分析输出 3-5 条可执行的改进方向

技术实现：
  ├── 规则引擎：预定义的 Python/JS 脚本，基于你的游戏理解
  │   例：IF 落地3分钟内死亡率 > 60% THEN 建议换落点
  └── LLM 总结层：将规则引擎的输出喂给 GPT-4o-mini
      生成自然语言建议（成本极低，约 $0.001/次）
```

#### F5：历史趋势追踪
```
付费用户每次都保存查询结果，生成：

  ├── K/D 趋势曲线
  ├── 段位变化曲线
  ├── 不同赛季使用传奇的变化
  └── 每周改进建议
```

#### F6：武器实验室
```
基于全服数据 + 用户个人数据：

  ├── 武器 TTK 对比计算器（理论+实战）
  ├── "我该用什么枪？"推荐引擎
  └── 配件组合对比
```

### 4.3 后期探索功能（第 5+ 月）

#### F7：社区功能
- 排行榜（Hunter/K/D/胜率/场均伤害）
- 俱乐部数据对比
- 组队匹配（基于数据匹配水平相近的队友）

#### F8：数据导出 & API
- 付费用户导出自己的数据（CSV/JSON）
- 开放 API（收费，按调用量计费）

---

## 五、数据库设计（核心表）

### 5.1 PostgreSQL Schema

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  subscription_tier VARCHAR(20) DEFAULT 'free', -- free / pro / premium
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 玩家档案（一个用户可以查多个玩家）
CREATE TABLE player_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(10) NOT NULL, -- origin / xbl / psn
  platform_identifier VARCHAR(100) NOT NULL,
  cached_stats JSONB,            -- 缓存的原始 API 响应
  last_synced_at TIMESTAMPTZ,
  UNIQUE(platform, platform_identifier)
);

-- 分析快照（每次查询保存一份，用于趋势追踪）
CREATE TABLE analysis_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  player_profile_id UUID REFERENCES player_profiles(id),
  snapshot_data JSONB NOT NULL,   -- 分析结果
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 全服元数据缓存
CREATE TABLE meta_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type VARCHAR(50) NOT NULL, -- legend_pickrate / weapon_usage / map_rotation
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_player_profiles_platform_id ON player_profiles(platform, platform_identifier);
CREATE INDEX idx_analysis_snapshots_user ON analysis_snapshots(user_id, created_at DESC);
```

### 5.2 Redis 缓存策略

| 数据 | TTL | 理由 |
|---|---|---|
| API 响应（玩家数据） | 30 分钟 | 数据有自然更新频率，减少 API 调用 |
| 地图轮换 | 15 分钟 | 地图每 15-60 分钟轮换 |
| 全服元数据 | 24 小时 | 选取率等数据不需要实时 |
| Session | 7 天 | 用户登录状态 |
| 限流计数 | 按窗口 | 防止 API 滥用 |

---

## 六、API 代理与国内网络优化

### 6.1 问题

Tracker.gg 和 Mozambique API 服务器均在海外，国内直接访问可能不稳定。

### 6.2 解决方案

```
用户浏览器 ──→ 你的国内服务器（阿里云/腾讯云）
                     │
                     ├── 本地有 Redis 缓存 → 直接返回 ✅
                     │
                     └── 缓存未命中 → 通过海外代理转发
                           │
                           ├── 方案1：同一服务器开启代理（简单但 IP 可能被限）
                           │
                           └── 方案2：Cloudflare Workers 做中转
                                免费 10万次/天，足够 MVP 阶段
```

**推荐方案：** Cloudflare Workers 做 API 转发层
- 免费额度足够 MVP 阶段
- 全球 CDN 节点，延迟低
- 可在 Workers 层做一层轻量缓存

---

## 七、开发路线图

```
Phase 0：技术准备（第 1-2 周）
  ├── 申请 Tracker.gg API Key（免费）
  ├── 申请 Mozambique API Key（免费）
  ├── 购买域名（建议简短、好记、中文友好）
  ├── 购买云服务器（阿里云 2c4g 轻量应用服务器 ≈ 60 元/月）
  └── 搭建开发环境 + Docker + CI/CD

Phase 1：MVP 后端（第 3-4 周）
  ├── 搭建 Fastify + TypeScript 项目骨架
  ├── 对接 Tracker.gg API（封装为 service 层）
  ├── 搭建 PostgreSQL + Redis（Docker Compose）
  ├── 实现玩家查询 API + 缓存层
  └── 编写 API 测试

Phase 2：MVP 前端（第 5-6 周）
  ├── React + TailwindCSS + shadcn/ui 初始化
  ├── 战绩查询页面（输入 ID → 展示基础数据）
  ├── 地图轮换组件
  ├── 段位对比雷达图
  └── 响应式适配（移动端 + PC）

Phase 3：分析引擎（第 7-8 周）
  ├── 编写核心分析规则（基于你的游戏理解）
  │   例：落地战分析、武器效率、生存模式分类
  ├── 接入 LLM 总结层（GPT-4o-mini / 国产大模型）
  └── 实现趋势追踪（保存分析快照）

Phase 4：付费体系（第 9-10 周）
  ├── 用户注册/登录（JWT + 邮箱验证）
  ├── 接入微信支付 / 支付宝
  ├── 付费墙：免费看基础数据，付费看深度分析
  └── 定价：基础免费 / Pro 9.9 元/月 / Premium 19.9 元/月

Phase 5：上线 & 推广（第 11-12 周）
  ├── 部署上线 + SSL + 备案（如用国内服务器）
  ├── SEO 优化（Apex 战绩查询 / Apex 数据分析等关键词）
  ├── 在小红书/B站发布"用数据提升段位"系列内容
  └── 收集用户反馈，迭代
```

---

## 八、成本预估

### 8.1 固定成本（月）

| 项目 | 方案 | 月成本 |
|---|---|---|
| 云服务器 | 阿里云轻量 2c4g | ¥60-100 |
| 域名 | .com / .cn | ¥50-100/年（≈ ¥5/月）|
| 数据库 | 同服务器自建 PostgreSQL | ¥0 |
| 海外代理 | Cloudflare Workers 免费层 | ¥0 |
| API Key | Tracker.gg 免费 + Mozambique 免费 | ¥0 |
| LLM 调用 | GPT-4o-mini（初期用户少） | ¥0-50 |
| **月合计** | | **¥65-155** |

### 8.2 扩展后的成本

| 用户量 | 服务器升级 | 预估月成本 |
|---|---|---|
| 100-1000 DAU | 当前方案够用 | ¥100 |
| 1000-5000 DAU | 4c8g 服务器 + 托管 Redis | ¥300-500 |
| 5000-20000 DAU | 多实例 + 负载均衡 + RDS | ¥1000-2000 |
| 20000+ DAU | 专业运维方案，但此时收入已经覆盖 | ¥3000-5000 |

---

## 九、收入模型测算

### 9.1 转化漏斗（保守估计）

```
假设通过内容引流：
  每月访问 20,000 次（SEO + 社区分享）
  → 注册用户 2,000 人（10% 转化）
  → 免费用户活跃 1,500 人
  → 付费转化 75 人（5% 付费率）
  → 人均 ARPU ¥15/月（Pro + Premium 混合）
  → 月收入 = 75 × 15 = ¥1,125
```

### 9.2 乐观估计（6-12 个月后）

```
每月访问 100,000 次
  → 注册用户 10,000 人
  → 付费用户 500 人（5% 转化）
  → 月收入 = 500 × 15 = ¥7,500
  + 广告收入 ¥1,000-3,000（可选）
  → 月收入 ¥8,500-10,500
```

### 9.3 收费策略建议

| 套餐 | 月费 | 功能 |
|---|---|---|
| 免费 | ¥0 | 基础战绩查询、地图轮换、段位对比（限 3 次/天） |
| Pro | ¥9.9/月 | 无限查询、AI 战术分析、历史追踪、5 个玩家档案 |
| Premium | ¥19.9/月 | Pro 全部 + 武器实验室、数据导出、专属建议、无限制档案 |

**关键：免费版要有真实价值，但让"进阶用户"觉得 9.9 元完全值得。**

---

## 十、核心差异化能力总结

```
竞品的护城河：数据量大、品牌知名度高
你的护城河   ：游戏理解 → 分析引擎 → AI 建议

竞品说：你的 K/D 是 1.8
你说：   你的 K/D 是 1.8，但你的有效击杀率（击杀导致团战胜利的比例）
         只有 60%，而大师段位平均是 75%。你在错误的时间杀了错误的人。
         问题出在第三圈后的交战决策——你的生存时间数据证明了这一点。
         建议：第三圈后优先进圈占点，减少 40% 的主动交火。
```

这就是 1200 小时 + 大师段位 + CS 技术的价值——**将数据翻译成可执行的改进建议**，而不只是展示数据。

---

## 附录：关键参考资料

| 资源 | 链接 |
|---|---|
| Tracker.gg 开发者文档 | https://tracker.gg/developers/docs/titles/apex |
| Mozambique API 文档 | https://apexlegendsapi.com |
| Apex Legends Status | https://apexlegendsstatus.com |
| GitHub 开源参考：Apex-Tracker | https://github.com/ChristianBosse/Apex-Tracker |
| NoneBot Apex 插件 | https://github.com/nonebot/nonebot-plugin-apex-api-query |

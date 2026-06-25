import { Hono } from "hono"
import { cors } from "hono/cors"

const app = new Hono()

// CORS: 允许前端域名访问
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "https://apex-data-rho.vercel.app"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
)

// 健康检查
app.get("/", (c) => c.json({ status: "ok", name: "apex-data-api" }))

// API 路由
const api = new Hono()

// 地图轮换
api.get("/map-rotation", async (c) => {
  // TODO: 对接 Mozambique API
  return c.json({ message: "not implemented yet" })
})

// 玩家查询
api.get("/player/:platform/:name", async (c) => {
  const { platform, name } = c.req.param()
  // TODO: 对接 Tracker.gg API
  return c.json({
    platform,
    name,
    message: "not implemented yet",
  })
})

// 挂载 /api 路由
app.route("/api", api)

export default app

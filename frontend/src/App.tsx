import { Button } from "@/components/ui/button"

function App() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight">Apex Data</h1>
        <p className="text-sm text-neutral-400">APEX 玩家数据分析工具</p>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-8">
          <h2 className="text-lg font-semibold mb-2">战绩查询</h2>
          <p className="text-sm text-neutral-400 mb-4">
            输入玩家 ID 和平台，获取详细战绩数据与深度分析
          </p>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm placeholder:text-neutral-500"
              placeholder="输入玩家 ID..."
            />
            <Button>查询</Button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

export type Platform = "origin" | "xbl" | "psn"

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "origin", label: "PC" },
  { value: "xbl", label: "Xbox" },
  { value: "psn", label: "PS" },
]

interface PlayerSearchProps {
  onSearch: (platform: Platform, name: string) => void
  loading: boolean
}

export function PlayerSearch({ onSearch, loading }: PlayerSearchProps) {
  const [platform, setPlatform] = useState<Platform>("origin")
  const [name, setName] = useState("")

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSearch(platform, trimmed)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 平台选择 */}
      <div className="flex gap-1 rounded-lg bg-neutral-800 p-1 w-fit">
        {PLATFORMS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPlatform(p.value)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              platform === p.value
                ? "bg-neutral-700 text-white"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 搜索框 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-500" />
          <input
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
            placeholder="输入玩家 ID（例如 ericzhang）..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
        </div>
        <Button type="submit" disabled={loading || !name.trim()}>
          {loading ? "查询中..." : "查询"}
        </Button>
      </div>
    </form>
  )
}

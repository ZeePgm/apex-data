const API_BASE = "https://apex-data-api.admitted-tower.workers.dev"

export async function fetchPlayer(platform: string, name: string) {
  const res = await fetch(`${API_BASE}/api/player/${platform}/${encodeURIComponent(name)}`)
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }
  return res.json()
}

export async function fetchMapRotation() {
  const res = await fetch(`${API_BASE}/api/map-rotation`)
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }
  return res.json()
}

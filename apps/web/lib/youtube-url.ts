const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
])

export function extractYoutubeVideoId(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  const host = parsed.hostname.toLowerCase()
  if (!YOUTUBE_HOSTS.has(host)) {
    return null
  }

  if (host === "youtu.be" || host === "www.youtu.be") {
    const id = parsed.pathname.split("/").filter(Boolean)[0]
    return id && /^[\w-]{11}$/.test(id) ? id : null
  }

  const path = parsed.pathname
  if (path === "/watch") {
    const id = parsed.searchParams.get("v")
    return id && /^[\w-]{11}$/.test(id) ? id : null
  }

  const match = path.match(/^\/(shorts|embed|live)\/([\w-]{11})/)
  if (match?.[2]) {
    return match[2]
  }

  return null
}

export function isYoutubeUrl(url: string): boolean {
  return extractYoutubeVideoId(url) !== null
}

export function canonicalYoutubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

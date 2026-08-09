export function normalizeWebUrl(url: string): string {
  const parsed = new URL(url)
  parsed.hash = ""

  if (
    (parsed.protocol === "https:" && parsed.port === "443") ||
    (parsed.protocol === "http:" && parsed.port === "80")
  ) {
    parsed.port = ""
  }

  let pathname = parsed.pathname
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1)
  }
  parsed.pathname = pathname

  return parsed.toString()
}

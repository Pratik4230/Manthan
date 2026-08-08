export type CitationChip = {
  index: number
  sourceId: string
  title: string
  url: string | null
  loc: Record<string, unknown> | null
  locLabel: string | null
  excerpt: string
}

export const CITATIONS_DATA_NAME = "citations"

export function formatCitationLoc(
  loc: Record<string, unknown> | null
): string | null {
  if (!loc) {
    return null
  }
  if (typeof loc.page === "number") {
    return `p. ${loc.page}`
  }
  if (typeof loc.sheet === "string" && loc.sheet.trim()) {
    return loc.sheet.trim()
  }
  if (typeof loc.sectionIndex === "number") {
    return `§ ${loc.sectionIndex + 1}`
  }
  return null
}

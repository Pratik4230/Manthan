import { ObjectId } from "mongodb"

import type { RagCitation } from "@/server/ai/graph"
import { getSourcesCollection } from "@/server/sources/collection"

export type CitationPayload = {
  index: number
  sourceId: string
  title: string
  url: string | null
  loc: Record<string, unknown> | null
  locLabel: string | null
  excerpt: string
}

export const CITATIONS_DATA_NAME = "citations"

function formatLocLabel(
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

export async function enrichCitations(
  ownerId: string,
  workspaceId: string,
  citations: RagCitation[]
): Promise<CitationPayload[]> {
  const sourceIds = [
    ...new Set(
      citations
        .map((citation) => citation.sourceId)
        .filter((id) => ObjectId.isValid(id))
    ),
  ]

  const titleById = new Map<string, { title: string; url: string | null }>()

  if (sourceIds.length > 0) {
    const collection = await getSourcesCollection()
    const sources = await collection
      .find({
        _id: { $in: sourceIds.map((id) => new ObjectId(id)) },
        workspaceId,
        ownerId,
      })
      .project({ title: 1, url: 1, imageKitUrl: 1 })
      .toArray()

    for (const source of sources) {
      titleById.set(source._id.toHexString(), {
        title: source.title,
        url: source.url ?? source.imageKitUrl ?? null,
      })
    }
  }

  return citations.map((citation) => {
    const source = titleById.get(citation.sourceId)
    return {
      index: citation.index,
      sourceId: citation.sourceId,
      title: source?.title ?? "Source",
      url: source?.url ?? null,
      loc: citation.loc,
      locLabel: formatLocLabel(citation.loc),
      excerpt: citation.text.slice(0, 240),
    }
  })
}

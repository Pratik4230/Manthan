import { getChunksVectorStore } from "@/server/vector/atlas"

export type WorkspaceChunkHit = {
  text: string
  score: number
  workspaceId: string
  sourceId: string
  loc: Record<string, unknown> | null
}

export async function searchWorkspaceChunks(input: {
  workspaceId: string
  query: string
  k?: number
  sourceIds?: string[]
}): Promise<WorkspaceChunkHit[]> {
  const { workspaceId, query, k = 8, sourceIds } = input
  const trimmed = query.trim()
  if (!trimmed) {
    return []
  }

  const preFilter: Record<string, unknown> = {
    workspaceId: { $eq: workspaceId },
  }

  if (sourceIds && sourceIds.length > 0) {
    preFilter.sourceId = { $in: sourceIds }
  }

  const vectorStore = await getChunksVectorStore()
  const results = await vectorStore.similaritySearchWithScore(trimmed, k, {
    preFilter,
  })

  return results.map(([doc, score]) => ({
    text: doc.pageContent,
    score,
    workspaceId: String(doc.metadata.workspaceId ?? workspaceId),
    sourceId: String(doc.metadata.sourceId ?? ""),
    loc:
      doc.metadata.loc && typeof doc.metadata.loc === "object"
        ? (doc.metadata.loc as Record<string, unknown>)
        : null,
  }))
}

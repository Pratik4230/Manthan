import { getChunksVectorStore } from "@/server/vector/atlas"

export type WorkspaceChunkHit = {
  text: string
  score: number
  workspaceId: string
  sourceId: string
  loc: Record<string, unknown> | null
}

export const DEFAULT_RETRIEVAL_K = 8
export const MAX_MERGED_HITS = 12

function chunkHitKey(hit: WorkspaceChunkHit): string {
  return `${hit.sourceId}::${hit.text}`
}

export function mergeChunkHits(
  batches: WorkspaceChunkHit[][],
  maxHits = MAX_MERGED_HITS
): WorkspaceChunkHit[] {
  const byKey = new Map<string, WorkspaceChunkHit>()

  for (const hits of batches) {
    for (const hit of hits) {
      const key = chunkHitKey(hit)
      const existing = byKey.get(key)
      if (!existing || hit.score > existing.score) {
        byKey.set(key, hit)
      }
    }
  }

  return [...byKey.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, maxHits)
}

export async function searchWorkspaceChunks(input: {
  workspaceId: string
  query: string
  k?: number
  sourceIds?: string[]
}): Promise<WorkspaceChunkHit[]> {
  const { workspaceId, query, k = DEFAULT_RETRIEVAL_K, sourceIds } = input
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

export async function searchWorkspaceChunksWithHyde(input: {
  workspaceId: string
  query: string
  hydePassage?: string
  k?: number
  sourceIds?: string[]
}): Promise<WorkspaceChunkHit[]> {
  const k = input.k ?? DEFAULT_RETRIEVAL_K
  const queryHits = await searchWorkspaceChunks({
    workspaceId: input.workspaceId,
    query: input.query,
    k,
    sourceIds: input.sourceIds,
  })

  const hyde = input.hydePassage?.trim()
  if (!hyde) {
    return queryHits
  }

  const hydeHits = await searchWorkspaceChunks({
    workspaceId: input.workspaceId,
    query: hyde,
    k,
    sourceIds: input.sourceIds,
  })

  return mergeChunkHits([queryHits, hydeHits], k)
}

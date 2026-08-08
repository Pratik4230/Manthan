import { Document } from "@langchain/core/documents"

import type { SourceChunk } from "@/server/ingest/chunk"
import { getChunksCollection } from "@/server/sources/chunks"
import { getChunksVectorStore } from "@/server/vector/atlas"

export async function deleteSourceChunks(
  workspaceId: string,
  sourceId: string
): Promise<void> {
  const collection = await getChunksCollection()
  await collection.deleteMany({ workspaceId, sourceId })
}

export async function upsertSourceChunks(input: {
  workspaceId: string
  sourceId: string
  chunks: SourceChunk[]
}): Promise<{ count: number }> {
  const { workspaceId, sourceId, chunks } = input

  if (chunks.length === 0) {
    throw new Error("No chunks to embed")
  }

  await deleteSourceChunks(workspaceId, sourceId)

  const vectorStore = await getChunksVectorStore()
  const now = new Date()

  const documents = chunks.map(
    (chunk) =>
      new Document({
        pageContent: chunk.text,
        metadata: {
          workspaceId,
          sourceId,
          loc: chunk.loc,
          createdAt: now,
        },
      })
  )

  await vectorStore.addDocuments(documents)

  return { count: documents.length }
}

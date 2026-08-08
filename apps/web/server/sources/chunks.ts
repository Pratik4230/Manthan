import type { Collection } from "mongodb"

import { collections, getDb } from "@/server/db"

export type ChunkDocument = {
  workspaceId: string
  sourceId: string
  text: string
  embedding?: number[]
  loc?: Record<string, unknown>
  createdAt?: Date
}

export async function getChunksCollection(): Promise<Collection<ChunkDocument>> {
  const db = await getDb()
  return db.collection<ChunkDocument>(collections.chunks)
}

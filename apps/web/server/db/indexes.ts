import { collections } from "@/server/db/collections"
import { getDb } from "@/server/db/client"

const globalForIndexes = globalThis as typeof globalThis & {
  mongoIndexesEnsured?: Promise<void>
}

async function createIndexes() {
  const db = await getDb()
  const workspaces = db.collection(collections.workspaces)
  const sources = db.collection(collections.sources)
  const chunks = db.collection(collections.chunks)
  const threads = db.collection(collections.threads)
  const chatMessages = db.collection(collections.chatMessages)

  await Promise.all([
    workspaces.createIndex(
      { ownerId: 1, updatedAt: -1 },
      { name: "ownerId_updatedAt" }
    ),
    workspaces.createIndex(
      { ownerId: 1, deletedAt: 1 },
      { name: "ownerId_deletedAt" }
    ),
    sources.createIndex(
      { workspaceId: 1, createdAt: -1 },
      { name: "workspaceId_createdAt" }
    ),
    sources.createIndex(
      { workspaceId: 1, ownerId: 1 },
      { name: "workspaceId_ownerId" }
    ),
    chunks.createIndex(
      { workspaceId: 1, sourceId: 1 },
      { name: "workspaceId_sourceId" }
    ),
    chunks.createIndex({ sourceId: 1 }, { name: "sourceId" }),
    threads.createIndex(
      { workspaceId: 1, ownerId: 1, updatedAt: -1 },
      { name: "workspaceId_ownerId_updatedAt" }
    ),
    threads.createIndex(
      { workspaceId: 1, ownerId: 1, status: 1 },
      { name: "workspaceId_ownerId_status" }
    ),
    chatMessages.createIndex(
      { threadId: 1, createdAt: 1 },
      { name: "threadId_createdAt" }
    ),
    chatMessages.createIndex(
      { threadId: 1, messageId: 1 },
      { name: "threadId_messageId", unique: true }
    ),
  ])
}

export async function ensureMongoIndexes() {
  if (!globalForIndexes.mongoIndexesEnsured) {
    globalForIndexes.mongoIndexesEnsured = createIndexes()
  }
  await globalForIndexes.mongoIndexesEnsured
}

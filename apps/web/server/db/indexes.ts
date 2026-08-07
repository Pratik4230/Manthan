import { collections } from "@/server/db/collections"
import { getDb } from "@/server/db/client"

const globalForIndexes = globalThis as typeof globalThis & {
  mongoIndexesEnsured?: Promise<void>
}

async function createWorkspaceIndexes() {
  const db = await getDb()
  const workspaces = db.collection(collections.workspaces)

  await Promise.all([
    workspaces.createIndex(
      { ownerId: 1, updatedAt: -1 },
      { name: "ownerId_updatedAt" }
    ),
    workspaces.createIndex(
      { ownerId: 1, deletedAt: 1 },
      { name: "ownerId_deletedAt" }
    ),
  ])
}

export async function ensureMongoIndexes() {
  if (!globalForIndexes.mongoIndexesEnsured) {
    globalForIndexes.mongoIndexesEnsured = createWorkspaceIndexes()
  }
  await globalForIndexes.mongoIndexesEnsured
}

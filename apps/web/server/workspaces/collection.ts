import type { Collection } from "mongodb"

import { collections, getDb } from "@/server/db"
import type { WorkspaceDocument } from "@/server/models/workspace"

export async function getWorkspacesCollection(): Promise<
  Collection<WorkspaceDocument>
> {
  const db = await getDb()
  return db.collection<WorkspaceDocument>(collections.workspaces)
}

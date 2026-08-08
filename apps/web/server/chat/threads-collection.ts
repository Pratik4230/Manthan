import type { Collection } from "mongodb"

import { collections, getDb } from "@/server/db"
import type { ThreadDocument } from "@/server/models/thread"

export async function getThreadsCollection(): Promise<
  Collection<ThreadDocument>
> {
  const db = await getDb()
  return db.collection<ThreadDocument>(collections.threads)
}

import type { Collection } from "mongodb"

import { collections, getDb } from "@/server/db"
import type { SourceDocument } from "@/server/models/source"

export async function getSourcesCollection(): Promise<
  Collection<SourceDocument>
> {
  const db = await getDb()
  return db.collection<SourceDocument>(collections.sources)
}

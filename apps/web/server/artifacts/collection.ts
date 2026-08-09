import type { Collection } from "mongodb"

import { collections, getDb } from "@/server/db"
import type { ArtifactDocument } from "@/server/models/artifact"

export async function getArtifactsCollection(): Promise<
  Collection<ArtifactDocument>
> {
  const db = await getDb()
  return db.collection<ArtifactDocument>(collections.artifacts)
}

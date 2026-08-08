import { ObjectId } from "mongodb"

import { getSourcesCollection } from "@/server/sources/collection"

export async function finalizeExtractedSource(
  sourceId: string,
  text: string
): Promise<void> {
  if (!ObjectId.isValid(sourceId)) {
    throw new Error("Invalid source id")
  }

  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error("Extracted text is empty")
  }

  const collection = await getSourcesCollection()
  const result = await collection.updateOne(
    { _id: new ObjectId(sourceId) },
    {
      $set: {
        extractedText: trimmed,
        status: "ready",
        error: null,
        updatedAt: new Date(),
      },
    }
  )

  if (result.matchedCount === 0) {
    throw new Error("Source not found")
  }
}

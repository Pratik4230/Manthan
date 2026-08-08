import { ObjectId } from "mongodb"

import { getSourcesCollection } from "@/server/sources/collection"

export async function saveExtractedText(
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
        updatedAt: new Date(),
      },
    }
  )

  if (result.matchedCount === 0) {
    throw new Error("Source not found")
  }
}

export async function finalizeExtractedSource(
  sourceId: string,
  text: string
): Promise<void> {
  await saveExtractedText(sourceId, text)

  const collection = await getSourcesCollection()
  await collection.updateOne(
    { _id: new ObjectId(sourceId) },
    {
      $set: {
        status: "ready",
        error: null,
        updatedAt: new Date(),
      },
    }
  )
}

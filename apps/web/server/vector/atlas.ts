import { MongoDBAtlasVectorSearch } from "@langchain/mongodb"

import { createEmbeddings } from "@/server/integrations/openai"
import { getChunksCollection } from "@/server/sources/chunks"

export const VECTOR_INDEX_NAME = "vector_index"

export async function getChunksVectorStore() {
  const collection = await getChunksCollection()
  return new MongoDBAtlasVectorSearch(createEmbeddings(), {
    collection: collection as never,
    indexName: VECTOR_INDEX_NAME,
    textKey: "text",
    embeddingKey: "embedding",
  })
}

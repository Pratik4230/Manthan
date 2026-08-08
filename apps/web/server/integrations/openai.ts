import { OpenAIEmbeddings } from "@langchain/openai"

import { env } from "@/server/env"

export const EMBEDDING_MODEL = "text-embedding-3-large"
export const EMBEDDING_DIMENSIONS = 3072

export function createEmbeddings() {
  return new OpenAIEmbeddings({
    apiKey: env.openaiApiKey,
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
  })
}

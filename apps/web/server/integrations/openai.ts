import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai"

import { env } from "@/server/env"

export const CHAT_MODEL = "gpt-5.4-mini"
export const EMBEDDING_MODEL = "text-embedding-3-large"
export const EMBEDDING_DIMENSIONS = 3072

export function createChatModel() {
  return new ChatOpenAI({
    apiKey: env.openaiApiKey,
    model: CHAT_MODEL,
    temperature: 0,
  })
}

export function createEmbeddings() {
  return new OpenAIEmbeddings({
    apiKey: env.openaiApiKey,
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
  })
}

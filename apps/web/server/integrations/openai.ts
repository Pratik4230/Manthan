import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai"

import { env } from "@/server/env"

export const CHAT_MODEL = "gpt-5.4-mini"
export const INTERNAL_CHAT_MODEL = "gpt-5.4-nano"
export const EMBEDDING_MODEL = "text-embedding-3-large"
export const EMBEDDING_DIMENSIONS = 3072

export function createChatModel(options?: { streaming?: boolean }) {
  return new ChatOpenAI({
    apiKey: env.openaiApiKey,
    model: CHAT_MODEL,
    temperature: 0,
    streaming: options?.streaming ?? false,
  })
}

export function createInternalChatModel() {
  return new ChatOpenAI({
    apiKey: env.openaiApiKey,
    model: INTERNAL_CHAT_MODEL,
    temperature: 0,
    streaming: false,
  })
}

export function createEmbeddings() {
  return new OpenAIEmbeddings({
    apiKey: env.openaiApiKey,
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
  })
}

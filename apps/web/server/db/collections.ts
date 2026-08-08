export const collections = {
  artifacts: "artifacts",
  chatMessages: "chat_messages",
  chunks: "chunks",
  sources: "sources",
  threads: "threads",
  workspaces: "workspaces",
} as const

export type CollectionName = (typeof collections)[keyof typeof collections]

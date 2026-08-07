export const collections = {
  artifacts: "artifacts",
  chunks: "chunks",
  sources: "sources",
  workspaces: "workspaces",
} as const

export type CollectionName = (typeof collections)[keyof typeof collections]

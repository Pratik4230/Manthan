export type ChatMessageDocument = {
  threadId: string
  workspaceId: string
  ownerId: string
  messageId: string
  parentId: string | null
  message: Record<string, unknown>
  createdAt: Date
}

export type ChatMessage = ChatMessageDocument & {
  _id: import("mongodb").ObjectId
}

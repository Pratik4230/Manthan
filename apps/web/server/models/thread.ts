export type ThreadStatus = "regular" | "archived"

export type ThreadDocument = {
  workspaceId: string
  ownerId: string
  title: string | null
  status: ThreadStatus
  createdAt: Date
  updatedAt: Date
}

export type Thread = ThreadDocument & {
  _id: import("mongodb").ObjectId
}

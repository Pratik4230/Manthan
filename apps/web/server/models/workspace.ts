import type { ObjectId } from "mongodb"

export type WorkspaceDocument = {
  ownerId: string
  title: string
  instructions: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export type Workspace = WorkspaceDocument & {
  _id: ObjectId
}

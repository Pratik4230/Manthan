import { ObjectId } from "mongodb"

import type { Workspace } from "@/server/models/workspace"
import { getWorkspacesCollection } from "@/server/workspaces/collection"
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from "@/server/workspaces/validations"

export type WorkspaceDto = {
  id: string
  ownerId: string
  title: string
  instructions: string
  summary: string | null
  createdAt: string
  updatedAt: string
}

function toDto(workspace: Workspace): WorkspaceDto {
  return {
    id: workspace._id.toHexString(),
    ownerId: workspace.ownerId,
    title: workspace.title,
    instructions: workspace.instructions,
    summary: workspace.summary ?? null,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  }
}

export async function createWorkspace(
  ownerId: string,
  input: CreateWorkspaceInput
): Promise<WorkspaceDto> {
  const collection = await getWorkspacesCollection()
  const now = new Date()

  const doc = {
    ownerId,
    title: input.title,
    instructions: input.instructions ?? "",
    summary: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }

  const result = await collection.insertOne(doc)

  return toDto({
    _id: result.insertedId,
    ...doc,
  })
}

export async function listWorkspaces(ownerId: string): Promise<WorkspaceDto[]> {
  const collection = await getWorkspacesCollection()
  const workspaces = await collection
    .find({ ownerId, deletedAt: null })
    .sort({ updatedAt: -1 })
    .toArray()

  return workspaces.map((workspace) =>
    toDto(workspace as Workspace)
  )
}

export async function getWorkspace(
  ownerId: string,
  workspaceId: string
): Promise<WorkspaceDto | null> {
  if (!ObjectId.isValid(workspaceId)) {
    return null
  }

  const collection = await getWorkspacesCollection()
  const workspace = await collection.findOne({
    _id: new ObjectId(workspaceId),
    ownerId,
    deletedAt: null,
  })

  return workspace ? toDto(workspace as Workspace) : null
}

export async function updateWorkspace(
  ownerId: string,
  workspaceId: string,
  input: UpdateWorkspaceInput
): Promise<WorkspaceDto | null> {
  if (!ObjectId.isValid(workspaceId)) {
    return null
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (input.title !== undefined) {
    updates.title = input.title
  }

  if (input.instructions !== undefined) {
    updates.instructions = input.instructions
  }

  const collection = await getWorkspacesCollection()
  const workspace = await collection.findOneAndUpdate(
    {
      _id: new ObjectId(workspaceId),
      ownerId,
      deletedAt: null,
    },
    { $set: updates },
    { returnDocument: "after" }
  )

  return workspace ? toDto(workspace as Workspace) : null
}

export async function deleteWorkspace(
  ownerId: string,
  workspaceId: string
): Promise<boolean> {
  if (!ObjectId.isValid(workspaceId)) {
    return false
  }

  const collection = await getWorkspacesCollection()
  const result = await collection.updateOne(
    {
      _id: new ObjectId(workspaceId),
      ownerId,
      deletedAt: null,
    },
    {
      $set: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  )

  return result.modifiedCount === 1
}

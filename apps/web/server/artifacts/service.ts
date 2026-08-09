import { ObjectId } from "mongodb"

import { getArtifactsCollection } from "@/server/artifacts/collection"
import type { CreateArtifactInput } from "@/server/artifacts/validations"
import { inngest } from "@/server/inngest/client"
import {
  ARTIFACT_TYPE_LABELS,
  type Artifact,
  type ArtifactStatus,
  type ArtifactType,
} from "@/server/models/artifact"
import { listEnabledReadySourceIds } from "@/server/sources/service"
import { getWorkspace } from "@/server/workspaces/service"

export type ArtifactDto = {
  id: string
  workspaceId: string
  ownerId: string
  type: ArtifactType
  title: string
  status: ArtifactStatus
  error: string | null
  content: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

function toDto(artifact: Artifact): ArtifactDto {
  return {
    id: artifact._id.toHexString(),
    workspaceId: artifact.workspaceId,
    ownerId: artifact.ownerId,
    type: artifact.type,
    title: artifact.title,
    status: artifact.status,
    error: artifact.error,
    content: artifact.content,
    createdAt: artifact.createdAt.toISOString(),
    updatedAt: artifact.updatedAt.toISOString(),
  }
}

async function assertWorkspaceOwner(ownerId: string, workspaceId: string) {
  const workspace = await getWorkspace(ownerId, workspaceId)
  if (!workspace) {
    throw new Response(JSON.stringify({ error: "Workspace not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }
  return workspace
}

export async function listArtifacts(
  ownerId: string,
  workspaceId: string
): Promise<ArtifactDto[]> {
  await assertWorkspaceOwner(ownerId, workspaceId)
  const collection = await getArtifactsCollection()
  const artifacts = await collection
    .find({ workspaceId, ownerId })
    .sort({ updatedAt: -1 })
    .toArray()
  return artifacts.map((artifact) => toDto(artifact as Artifact))
}

export async function getArtifact(
  ownerId: string,
  workspaceId: string,
  artifactId: string
): Promise<ArtifactDto | null> {
  if (!ObjectId.isValid(artifactId)) {
    return null
  }
  await assertWorkspaceOwner(ownerId, workspaceId)
  const collection = await getArtifactsCollection()
  const artifact = await collection.findOne({
    _id: new ObjectId(artifactId),
    workspaceId,
    ownerId,
  })
  return artifact ? toDto(artifact as Artifact) : null
}

export async function createArtifact(
  ownerId: string,
  workspaceId: string,
  input: CreateArtifactInput
): Promise<ArtifactDto> {
  await assertWorkspaceOwner(ownerId, workspaceId)

  const sourceIds = await listEnabledReadySourceIds(ownerId, workspaceId)
  if (sourceIds.length === 0) {
    throw new Response(
      JSON.stringify({
        error: "Add at least one ready source before generating Studio artifacts",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    )
  }

  const collection = await getArtifactsCollection()
  const now = new Date()
  const doc = {
    workspaceId,
    ownerId,
    type: input.type,
    title: ARTIFACT_TYPE_LABELS[input.type],
    status: "pending" as const,
    error: null,
    content: null,
    createdAt: now,
    updatedAt: now,
  }

  const result = await collection.insertOne(doc)
  const artifactId = result.insertedId.toHexString()

  await inngest.send({
    name: "artifact/generate.requested",
    data: {
      artifactId,
      workspaceId,
      ownerId,
      type: input.type,
    },
  })

  return toDto({
    _id: result.insertedId,
    ...doc,
  })
}

export async function regenerateArtifact(
  ownerId: string,
  workspaceId: string,
  artifactId: string
): Promise<ArtifactDto | null> {
  if (!ObjectId.isValid(artifactId)) {
    return null
  }

  await assertWorkspaceOwner(ownerId, workspaceId)

  const sourceIds = await listEnabledReadySourceIds(ownerId, workspaceId)
  if (sourceIds.length === 0) {
    throw new Response(
      JSON.stringify({
        error: "Add at least one ready source before regenerating",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    )
  }

  const collection = await getArtifactsCollection()
  const artifact = await collection.findOne({
    _id: new ObjectId(artifactId),
    workspaceId,
    ownerId,
  })

  if (!artifact) {
    return null
  }

  if (artifact.status === "pending" || artifact.status === "processing") {
    throw new Response(
      JSON.stringify({ error: "Artifact generation is already in progress" }),
      {
        status: 409,
        headers: { "Content-Type": "application/json" },
      }
    )
  }

  const now = new Date()
  await collection.updateOne(
    { _id: new ObjectId(artifactId) },
    {
      $set: {
        status: "pending",
        error: null,
        content: null,
        updatedAt: now,
      },
    }
  )

  await inngest.send({
    name: "artifact/generate.requested",
    data: {
      artifactId,
      workspaceId,
      ownerId,
      type: artifact.type,
    },
  })

  const updated = await collection.findOne({ _id: new ObjectId(artifactId) })
  return updated ? toDto(updated as Artifact) : null
}

export async function deleteArtifact(
  ownerId: string,
  workspaceId: string,
  artifactId: string
): Promise<boolean> {
  if (!ObjectId.isValid(artifactId)) {
    return false
  }

  await assertWorkspaceOwner(ownerId, workspaceId)
  const collection = await getArtifactsCollection()
  const result = await collection.deleteOne({
    _id: new ObjectId(artifactId),
    workspaceId,
    ownerId,
  })
  return result.deletedCount === 1
}

export async function getArtifactById(
  artifactId: string
): Promise<Artifact | null> {
  if (!ObjectId.isValid(artifactId)) {
    return null
  }
  const collection = await getArtifactsCollection()
  const artifact = await collection.findOne({ _id: new ObjectId(artifactId) })
  return artifact ? (artifact as Artifact) : null
}

export async function setArtifactStatus(
  artifactId: string,
  status: ArtifactStatus,
  error: string | null = null
) {
  if (!ObjectId.isValid(artifactId)) {
    return
  }
  const collection = await getArtifactsCollection()
  await collection.updateOne(
    { _id: new ObjectId(artifactId) },
    {
      $set: {
        status,
        error,
        updatedAt: new Date(),
      },
    }
  )
}

export async function setArtifactReady(
  artifactId: string,
  content: Record<string, unknown>
) {
  if (!ObjectId.isValid(artifactId)) {
    return
  }
  const collection = await getArtifactsCollection()
  await collection.updateOne(
    { _id: new ObjectId(artifactId) },
    {
      $set: {
        status: "ready",
        error: null,
        content,
        updatedAt: new Date(),
      },
    }
  )
}

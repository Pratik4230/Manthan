import { ObjectId } from "mongodb"

import { inngest } from "@/server/inngest/client"
import type { Source } from "@/server/models/source"
import { deleteSourceChunks } from "@/server/ingest/embed"
import { getSourcesCollection } from "@/server/sources/collection"
import type {
  CreateFileSourceInput,
  CreateWebSourceInput,
  CreateYoutubeSourceInput,
} from "@/server/sources/validations"
import { deleteImageKitFile } from "@/server/integrations/imagekit"
import {
  canonicalYoutubeUrl,
  extractYoutubeVideoId,
} from "@/lib/youtube-url"
import { getWorkspace } from "@/server/workspaces/service"

export type SourceDto = {
  id: string
  workspaceId: string
  ownerId: string
  type: "file" | "youtube" | "web"
  title: string
  status: "pending" | "processing" | "ready" | "failed"
  error: string | null
  enabled: boolean
  mimeType: string | null
  fileName: string | null
  fileSize: number | null
  imageKitFileId: string | null
  imageKitUrl: string | null
  url: string | null
  createdAt: string
  updatedAt: string
}

function toDto(source: Source): SourceDto {
  return {
    id: source._id.toHexString(),
    workspaceId: source.workspaceId,
    ownerId: source.ownerId,
    type: source.type,
    title: source.title,
    status: source.status,
    error: source.error,
    enabled: source.enabled,
    mimeType: source.mimeType,
    fileName: source.fileName,
    fileSize: source.fileSize,
    imageKitFileId: source.imageKitFileId,
    imageKitUrl: source.imageKitUrl,
    url: source.url,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
  }
}

async function assertWorkspaceOwner(ownerId: string, workspaceId: string) {
  const workspace = await getWorkspace(ownerId, workspaceId)
  if (!workspace) {
    return null
  }
  return workspace
}

export async function createFileSource(
  ownerId: string,
  workspaceId: string,
  input: CreateFileSourceInput
): Promise<SourceDto> {
  const workspace = await assertWorkspaceOwner(ownerId, workspaceId)
  if (!workspace) {
    throw new Response(JSON.stringify({ error: "Workspace not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  const collection = await getSourcesCollection()
  const now = new Date()

  const doc = {
    workspaceId,
    ownerId,
    type: "file" as const,
    title: input.title,
    status: "pending" as const,
    error: null,
    enabled: true,
    mimeType: input.mimeType,
    fileName: input.fileName,
    fileSize: input.fileSize,
    imageKitFileId: input.imageKitFileId,
    imageKitUrl: input.imageKitUrl,
    url: null,
    extractedText: null,
    createdAt: now,
    updatedAt: now,
  }

  const result = await collection.insertOne(doc)
  const sourceId = result.insertedId.toHexString()

  await inngest.send({
    name: "source/ingest.requested",
    data: {
      sourceId,
      workspaceId,
      ownerId,
      sourceType: "file",
    },
  })

  return toDto({
    _id: result.insertedId,
    ...doc,
  })
}

function titleFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, "")
  } catch {
    return "Web page"
  }
}

export async function createWebSource(
  ownerId: string,
  workspaceId: string,
  input: CreateWebSourceInput
): Promise<SourceDto> {
  const workspace = await assertWorkspaceOwner(ownerId, workspaceId)
  if (!workspace) {
    throw new Response(JSON.stringify({ error: "Workspace not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  const normalizedUrl = new URL(input.url).toString()
  const collection = await getSourcesCollection()
  const now = new Date()

  const doc = {
    workspaceId,
    ownerId,
    type: "web" as const,
    title: input.title?.trim() || titleFromUrl(normalizedUrl),
    status: "pending" as const,
    error: null,
    enabled: true,
    mimeType: "text/html",
    fileName: null,
    fileSize: null,
    imageKitFileId: null,
    imageKitUrl: null,
    url: normalizedUrl,
    extractedText: null,
    createdAt: now,
    updatedAt: now,
  }

  const result = await collection.insertOne(doc)
  const sourceId = result.insertedId.toHexString()

  await inngest.send({
    name: "source/ingest.requested",
    data: {
      sourceId,
      workspaceId,
      ownerId,
      sourceType: "web",
    },
  })

  return toDto({
    _id: result.insertedId,
    ...doc,
  })
}

export async function createYoutubeSource(
  ownerId: string,
  workspaceId: string,
  input: CreateYoutubeSourceInput
): Promise<SourceDto> {
  const workspace = await assertWorkspaceOwner(ownerId, workspaceId)
  if (!workspace) {
    throw new Response(JSON.stringify({ error: "Workspace not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  const videoId = extractYoutubeVideoId(input.url)
  if (!videoId) {
    throw new Response(JSON.stringify({ error: "Invalid YouTube URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const normalizedUrl = canonicalYoutubeUrl(videoId)
  const collection = await getSourcesCollection()
  const now = new Date()

  const doc = {
    workspaceId,
    ownerId,
    type: "youtube" as const,
    title: input.title?.trim() || `YouTube ${videoId}`,
    status: "pending" as const,
    error: null,
    enabled: true,
    mimeType: "video/youtube",
    fileName: null,
    fileSize: null,
    imageKitFileId: null,
    imageKitUrl: null,
    url: normalizedUrl,
    extractedText: null,
    createdAt: now,
    updatedAt: now,
  }

  const result = await collection.insertOne(doc)
  const sourceId = result.insertedId.toHexString()

  await inngest.send({
    name: "source/ingest.requested",
    data: {
      sourceId,
      workspaceId,
      ownerId,
      sourceType: "youtube",
    },
  })

  return toDto({
    _id: result.insertedId,
    ...doc,
  })
}

export async function getSourceById(sourceId: string): Promise<Source | null> {
  if (!ObjectId.isValid(sourceId)) {
    return null
  }

  const collection = await getSourcesCollection()
  const source = await collection.findOne({ _id: new ObjectId(sourceId) })
  return source ? (source as Source) : null
}

export async function listSources(
  ownerId: string,
  workspaceId: string
): Promise<SourceDto[]> {
  const workspace = await assertWorkspaceOwner(ownerId, workspaceId)
  if (!workspace) {
    throw new Response(JSON.stringify({ error: "Workspace not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  const collection = await getSourcesCollection()
  const sources = await collection
    .find({ workspaceId, ownerId })
    .sort({ createdAt: -1 })
    .toArray()

  return sources.map((source) => toDto(source as Source))
}

export async function listEnabledReadySourceIds(
  ownerId: string,
  workspaceId: string
): Promise<string[]> {
  const workspace = await assertWorkspaceOwner(ownerId, workspaceId)
  if (!workspace) {
    throw new Response(JSON.stringify({ error: "Workspace not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  const collection = await getSourcesCollection()
  const sources = await collection
    .find({
      workspaceId,
      ownerId,
      enabled: true,
      status: "ready",
    })
    .project({ _id: 1 })
    .toArray()

  return sources.map((source) => source._id.toHexString())
}

export async function deleteSource(
  ownerId: string,
  workspaceId: string,
  sourceId: string
): Promise<boolean> {
  if (!ObjectId.isValid(sourceId)) {
    return false
  }

  const workspace = await assertWorkspaceOwner(ownerId, workspaceId)
  if (!workspace) {
    return false
  }

  const collection = await getSourcesCollection()
  const source = await collection.findOne({
    _id: new ObjectId(sourceId),
    workspaceId,
    ownerId,
  })

  if (!source) {
    return false
  }

  if (source.imageKitFileId) {
    try {
      await deleteImageKitFile(source.imageKitFileId)
    } catch {
      void 0
    }
  }

  await deleteSourceChunks(workspaceId, sourceId)

  const result = await collection.deleteOne({
    _id: new ObjectId(sourceId),
    workspaceId,
    ownerId,
  })

  return result.deletedCount === 1
}

export async function setSourceStatus(
  sourceId: string,
  status: Source["status"],
  error: string | null = null
) {
  if (!ObjectId.isValid(sourceId)) {
    return
  }

  const collection = await getSourcesCollection()
  await collection.updateOne(
    { _id: new ObjectId(sourceId) },
    {
      $set: {
        status,
        error,
        updatedAt: new Date(),
      },
    }
  )
}

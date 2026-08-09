import { ObjectId } from "mongodb"

import type { Source } from "@/server/models/source"
import { getSourcesCollection } from "@/server/sources/collection"
import type { SourceDto } from "@/server/sources/service"

function toDuplicateDto(source: Source): SourceDto {
  return {
    id: source._id.toHexString(),
    workspaceId: source.workspaceId,
    ownerId: source.ownerId,
    type: source.type,
    title: source.title,
    status: source.status,
    ingestStage: source.ingestStage ?? null,
    error: source.error,
    enabled: source.enabled,
    mimeType: source.mimeType,
    fileName: source.fileName,
    fileSize: source.fileSize,
    imageKitFileId: source.imageKitFileId,
    imageKitUrl: source.imageKitUrl,
    url: source.url,
    summary: source.summary ?? null,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
  }
}

export function duplicateSourceResponse(existingSource: SourceDto): Response {
  return new Response(
    JSON.stringify({
      error: "duplicate_source",
      message: "This source already exists in this workspace.",
      existingSource,
    }),
    {
      status: 409,
      headers: { "Content-Type": "application/json" },
    }
  )
}

export async function findDuplicateFileSource(
  workspaceId: string,
  ownerId: string,
  contentSha256: string,
  excludeSourceId?: string
): Promise<Source | null> {
  const collection = await getSourcesCollection()
  const filter: Record<string, unknown> = {
    workspaceId,
    ownerId,
    type: "file",
    contentSha256,
  }

  if (excludeSourceId && ObjectId.isValid(excludeSourceId)) {
    filter._id = { $ne: new ObjectId(excludeSourceId) }
  }

  const source = await collection.findOne(filter)
  return source ? (source as Source) : null
}

export async function findDuplicateWebSource(
  workspaceId: string,
  ownerId: string,
  normalizedUrl: string,
  excludeSourceId?: string
): Promise<Source | null> {
  const collection = await getSourcesCollection()
  const filter: Record<string, unknown> = {
    workspaceId,
    ownerId,
    type: "web",
    url: normalizedUrl,
  }

  if (excludeSourceId && ObjectId.isValid(excludeSourceId)) {
    filter._id = { $ne: new ObjectId(excludeSourceId) }
  }

  const source = await collection.findOne(filter)
  return source ? (source as Source) : null
}

export async function findDuplicateYoutubeSource(
  workspaceId: string,
  ownerId: string,
  youtubeVideoId: string,
  excludeSourceId?: string
): Promise<Source | null> {
  const collection = await getSourcesCollection()
  const filter: Record<string, unknown> = {
    workspaceId,
    ownerId,
    type: "youtube",
    youtubeVideoId,
  }

  if (excludeSourceId && ObjectId.isValid(excludeSourceId)) {
    filter._id = { $ne: new ObjectId(excludeSourceId) }
  }

  const source = await collection.findOne(filter)
  return source ? (source as Source) : null
}

export async function assertNoDuplicateOrThrow(
  existing: Source | null
): Promise<void> {
  if (!existing) {
    return
  }
  throw duplicateSourceResponse(toDuplicateDto(existing))
}

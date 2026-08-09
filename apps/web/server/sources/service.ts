import { ObjectId } from "mongodb"

import { inngest } from "@/server/inngest/client"
import type { IngestStage, Source } from "@/server/models/source"
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
import { normalizeWebUrl } from "@/lib/normalize-web-url"
import { getWorkspace } from "@/server/workspaces/service"
import {
  assertNoDuplicateOrThrow,
  findDuplicateFileSource,
  findDuplicateWebSource,
  findDuplicateYoutubeSource,
} from "@/server/sources/duplicate"

export type SourceDto = {
  id: string
  workspaceId: string
  ownerId: string
  type: "file" | "youtube" | "web"
  title: string
  status: "pending" | "processing" | "ready" | "failed"
  ingestStage:
    | "queued"
    | "downloading"
    | "parsing"
    | "chunking"
    | "embedding"
    | "summarizing"
    | "indexing"
    | null
  error: string | null
  enabled: boolean
  mimeType: string | null
  fileName: string | null
  fileSize: number | null
  imageKitFileId: string | null
  imageKitUrl: string | null
  url: string | null
  summary: string | null
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

async function assertWorkspaceOwner(ownerId: string, workspaceId: string) {
  const workspace = await getWorkspace(ownerId, workspaceId)
  if (!workspace) {
    return null
  }
  return workspace
}

async function queueSourceIngest(input: {
  sourceId: string
  workspaceId: string
  ownerId: string
  sourceType: Source["type"]
}) {
  await inngest.send({
    name: "source/ingest.requested",
    data: input,
  })
}

async function getOwnedSource(
  ownerId: string,
  workspaceId: string,
  sourceId: string
): Promise<Source | null> {
  if (!ObjectId.isValid(sourceId)) {
    return null
  }

  const collection = await getSourcesCollection()
  const source = await collection.findOne({
    _id: new ObjectId(sourceId),
    workspaceId,
    ownerId,
  })

  return source ? (source as Source) : null
}

async function replaceFileSource(
  ownerId: string,
  workspaceId: string,
  sourceId: string,
  input: CreateFileSourceInput
): Promise<SourceDto> {
  const source = await getOwnedSource(ownerId, workspaceId, sourceId)
  if (!source || source.type !== "file") {
    throw new Response(JSON.stringify({ error: "Source not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (source.status === "processing" || source.status === "pending") {
    throw new Response(
      JSON.stringify({ error: "Source ingest is already in progress" }),
      {
        status: 409,
        headers: { "Content-Type": "application/json" },
      }
    )
  }

  if (
    source.imageKitFileId &&
    source.imageKitFileId !== input.imageKitFileId
  ) {
    try {
      await deleteImageKitFile(source.imageKitFileId)
    } catch {
      void 0
    }
  }

  const collection = await getSourcesCollection()
  const now = new Date()

  await collection.updateOne(
    { _id: new ObjectId(sourceId), workspaceId, ownerId },
    {
      $set: {
        title: input.title,
        status: "pending",
        ingestStage: "queued",
        error: null,
        mimeType: input.mimeType,
        fileName: input.fileName,
        fileSize: input.fileSize,
        imageKitFileId: input.imageKitFileId,
        imageKitUrl: input.imageKitUrl,
        contentSha256: input.clientContentHash ?? null,
        extractedText: null,
        ingestParsedSections: null,
        summary: null,
        updatedAt: now,
      },
    }
  )

  await queueSourceIngest({
    sourceId,
    workspaceId,
    ownerId,
    sourceType: "file",
  })

  const updated = await collection.findOne({ _id: new ObjectId(sourceId) })
  if (!updated) {
    throw new Response(JSON.stringify({ error: "Source not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  return toDto(updated as Source)
}

async function replaceUrlSource(
  ownerId: string,
  workspaceId: string,
  sourceId: string,
  input: { title?: string }
): Promise<SourceDto> {
  const replaced = await retrySourceIngest(ownerId, workspaceId, sourceId)
  if (!replaced) {
    throw new Response(JSON.stringify({ error: "Source not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  const title = input.title?.trim()
  if (!title) {
    return replaced
  }

  const collection = await getSourcesCollection()
  await collection.updateOne(
    { _id: new ObjectId(sourceId), workspaceId, ownerId },
    {
      $set: {
        title,
        updatedAt: new Date(),
      },
    }
  )

  const updated = await collection.findOne({ _id: new ObjectId(sourceId) })
  return updated ? toDto(updated as Source) : replaced
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

  if (input.replaceSourceId) {
    return replaceFileSource(ownerId, workspaceId, input.replaceSourceId, input)
  }

  if (input.clientContentHash && !input.forceDuplicate) {
    const duplicate = await findDuplicateFileSource(
      workspaceId,
      ownerId,
      input.clientContentHash
    )
    await assertNoDuplicateOrThrow(duplicate)
  }

  const collection = await getSourcesCollection()
  const now = new Date()

  const doc = {
    workspaceId,
    ownerId,
    type: "file" as const,
    title: input.title,
    status: "pending" as const,
    ingestStage: "queued" as const,
    error: null,
    enabled: true,
    mimeType: input.mimeType,
    fileName: input.fileName,
    fileSize: input.fileSize,
    imageKitFileId: input.imageKitFileId,
    imageKitUrl: input.imageKitUrl,
    url: null,
    youtubeVideoId: null,
    contentSha256: input.clientContentHash ?? null,
    extractedText: null,
    ingestParsedSections: null,
    summary: null,
    createdAt: now,
    updatedAt: now,
  }

  const result = await collection.insertOne(doc)
  const sourceId = result.insertedId.toHexString()

  await queueSourceIngest({
    sourceId,
    workspaceId,
    ownerId,
    sourceType: "file",
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

  const normalizedUrl = normalizeWebUrl(input.url)

  if (input.replaceSourceId) {
    const existing = await getOwnedSource(
      ownerId,
      workspaceId,
      input.replaceSourceId
    )
    if (!existing || existing.type !== "web") {
      throw new Response(JSON.stringify({ error: "Source not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    const collection = await getSourcesCollection()
    await collection.updateOne(
      { _id: new ObjectId(input.replaceSourceId), workspaceId, ownerId },
      {
        $set: {
          url: normalizedUrl,
          updatedAt: new Date(),
        },
      }
    )

    return replaceUrlSource(ownerId, workspaceId, input.replaceSourceId, {
      title: input.title,
    })
  }

  if (!input.forceDuplicate) {
    const duplicate = await findDuplicateWebSource(
      workspaceId,
      ownerId,
      normalizedUrl
    )
    await assertNoDuplicateOrThrow(duplicate)
  }

  const collection = await getSourcesCollection()
  const now = new Date()

  const doc = {
    workspaceId,
    ownerId,
    type: "web" as const,
    title: input.title?.trim() || titleFromUrl(normalizedUrl),
    status: "pending" as const,
    ingestStage: "queued" as const,
    error: null,
    enabled: true,
    mimeType: "text/html",
    fileName: null,
    fileSize: null,
    imageKitFileId: null,
    imageKitUrl: null,
    url: normalizedUrl,
    youtubeVideoId: null,
    contentSha256: null,
    extractedText: null,
    ingestParsedSections: null,
    summary: null,
    createdAt: now,
    updatedAt: now,
  }

  const result = await collection.insertOne(doc)
  const sourceId = result.insertedId.toHexString()

  await queueSourceIngest({
    sourceId,
    workspaceId,
    ownerId,
    sourceType: "web",
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

  if (input.replaceSourceId) {
    const existing = await getOwnedSource(
      ownerId,
      workspaceId,
      input.replaceSourceId
    )
    if (!existing || existing.type !== "youtube") {
      throw new Response(JSON.stringify({ error: "Source not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    const collection = await getSourcesCollection()
    await collection.updateOne(
      { _id: new ObjectId(input.replaceSourceId), workspaceId, ownerId },
      {
        $set: {
          url: normalizedUrl,
          youtubeVideoId: videoId,
          updatedAt: new Date(),
        },
      }
    )

    return replaceUrlSource(ownerId, workspaceId, input.replaceSourceId, {
      title: input.title,
    })
  }

  if (!input.forceDuplicate) {
    const duplicate = await findDuplicateYoutubeSource(
      workspaceId,
      ownerId,
      videoId
    )
    await assertNoDuplicateOrThrow(duplicate)
  }

  const collection = await getSourcesCollection()
  const now = new Date()

  const doc = {
    workspaceId,
    ownerId,
    type: "youtube" as const,
    title: input.title?.trim() || `YouTube ${videoId}`,
    status: "pending" as const,
    ingestStage: "queued" as const,
    error: null,
    enabled: true,
    mimeType: "video/youtube",
    fileName: null,
    fileSize: null,
    imageKitFileId: null,
    imageKitUrl: null,
    url: normalizedUrl,
    youtubeVideoId: videoId,
    contentSha256: null,
    extractedText: null,
    ingestParsedSections: null,
    summary: null,
    createdAt: now,
    updatedAt: now,
  }

  const result = await collection.insertOne(doc)
  const sourceId = result.insertedId.toHexString()

  await queueSourceIngest({
    sourceId,
    workspaceId,
    ownerId,
    sourceType: "youtube",
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
  const update: Record<string, unknown> = {
    status,
    error,
    updatedAt: new Date(),
  }

  if (status === "failed") {
    update.ingestParsedSections = null
  }

  await collection.updateOne(
    { _id: new ObjectId(sourceId) },
    {
      $set: update,
    }
  )
}

export async function setIngestStage(sourceId: string, ingestStage: IngestStage) {
  if (!ObjectId.isValid(sourceId)) {
    return
  }

  const collection = await getSourcesCollection()
  await collection.updateOne(
    { _id: new ObjectId(sourceId) },
    {
      $set: {
        ingestStage,
        updatedAt: new Date(),
      },
    }
  )
}

export async function saveSourceContentSha256(
  sourceId: string,
  contentSha256: string
) {
  if (!ObjectId.isValid(sourceId)) {
    return
  }

  const collection = await getSourcesCollection()
  await collection.updateOne(
    { _id: new ObjectId(sourceId) },
    {
      $set: {
        contentSha256,
        updatedAt: new Date(),
      },
    }
  )
}

export async function saveIngestExtractedContent(
  sourceId: string,
  input: {
    text: string
    ingestParsedSections: Source["ingestParsedSections"]
  }
) {
  if (!ObjectId.isValid(sourceId)) {
    return
  }

  const collection = await getSourcesCollection()
  await collection.updateOne(
    { _id: new ObjectId(sourceId) },
    {
      $set: {
        extractedText: input.text,
        ingestParsedSections: input.ingestParsedSections,
        updatedAt: new Date(),
      },
    }
  )
}

export async function clearIngestWorkingState(sourceId: string) {
  if (!ObjectId.isValid(sourceId)) {
    return
  }

  const collection = await getSourcesCollection()
  await collection.updateOne(
    { _id: new ObjectId(sourceId) },
    {
      $set: {
        ingestStage: null,
        ingestParsedSections: null,
        updatedAt: new Date(),
      },
    }
  )
}

export async function setSourceReady(
  sourceId: string,
  summary: string | null
) {
  if (!ObjectId.isValid(sourceId)) {
    return
  }

  const collection = await getSourcesCollection()
  await collection.updateOne(
    { _id: new ObjectId(sourceId) },
    {
      $set: {
        status: "ready",
        error: null,
        summary,
        ingestStage: null,
        ingestParsedSections: null,
        updatedAt: new Date(),
      },
    }
  )
}

export async function retrySourceIngest(
  ownerId: string,
  workspaceId: string,
  sourceId: string
): Promise<SourceDto | null> {
  if (!ObjectId.isValid(sourceId)) {
    return null
  }

  const workspace = await assertWorkspaceOwner(ownerId, workspaceId)
  if (!workspace) {
    return null
  }

  const collection = await getSourcesCollection()
  const source = await collection.findOne({
    _id: new ObjectId(sourceId),
    workspaceId,
    ownerId,
  })

  if (!source) {
    return null
  }

  if (source.status === "processing" || source.status === "pending") {
    throw new Response(
      JSON.stringify({ error: "Source ingest is already in progress" }),
      {
        status: 409,
        headers: { "Content-Type": "application/json" },
      }
    )
  }

  const now = new Date()
  await collection.updateOne(
    { _id: new ObjectId(sourceId), workspaceId, ownerId },
    {
      $set: {
        status: "pending",
        error: null,
        ingestStage: "queued",
        ingestParsedSections: null,
        updatedAt: now,
      },
    }
  )

  await queueSourceIngest({
    sourceId,
    workspaceId,
    ownerId,
    sourceType: source.type,
  })

  const updated = await collection.findOne({ _id: new ObjectId(sourceId) })
  return updated ? toDto(updated as Source) : null
}

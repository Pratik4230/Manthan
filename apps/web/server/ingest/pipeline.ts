import { chunkParsedDocument, chunkPlainText } from "@/server/ingest/chunk"
import { upsertSourceChunks } from "@/server/ingest/embed"
import { saveExtractedText } from "@/server/ingest/finalize"
import {
  extensionFromFileName,
  extensionFromMimeType,
  parseFileBuffer,
} from "@/server/ingest/parse"
import {
  generateSourceSummary,
  refreshWorkspaceSummary,
} from "@/server/ingest/summarize"
import { scrapeWebPage } from "@/server/integrations/firecrawl"
import { downloadImageKitFile } from "@/server/integrations/imagekit"
import { fetchYoutubeTranscriptText } from "@/server/integrations/youtube"
import type { Source } from "@/server/models/source"
import { getSourceById, setSourceReady } from "@/server/sources/service"

async function ingestFileSource(source: Source): Promise<{
  chunkCount: number
  text: string
}> {
  if (!source.imageKitUrl) {
    throw new Error("Source file URL missing")
  }

  const extension =
    (source.fileName ? extensionFromFileName(source.fileName) : null) ??
    extensionFromMimeType(source.mimeType)

  if (!extension) {
    throw new Error("Unsupported or unknown file type")
  }

  const bytes = await downloadImageKitFile(source.imageKitUrl)
  const parsed = await parseFileBuffer(bytes, extension)
  await saveExtractedText(source._id.toHexString(), parsed.text)
  const chunks = await chunkParsedDocument(parsed)
  const result = await upsertSourceChunks({
    workspaceId: source.workspaceId,
    sourceId: source._id.toHexString(),
    chunks,
  })
  return { chunkCount: result.count, text: parsed.text }
}

async function ingestWebSource(source: Source): Promise<{
  chunkCount: number
  text: string
}> {
  if (!source.url) {
    throw new Error("Source URL missing")
  }

  const text = await scrapeWebPage(source.url)
  await saveExtractedText(source._id.toHexString(), text)
  const chunks = await chunkPlainText(text)
  const result = await upsertSourceChunks({
    workspaceId: source.workspaceId,
    sourceId: source._id.toHexString(),
    chunks,
  })
  return { chunkCount: result.count, text }
}

async function ingestYoutubeSource(source: Source): Promise<{
  chunkCount: number
  text: string
}> {
  if (!source.url) {
    throw new Error("Source URL missing")
  }

  const text = await fetchYoutubeTranscriptText(source.url)
  await saveExtractedText(source._id.toHexString(), text)
  const chunks = await chunkPlainText(text)
  const result = await upsertSourceChunks({
    workspaceId: source.workspaceId,
    sourceId: source._id.toHexString(),
    chunks,
  })
  return { chunkCount: result.count, text }
}

export async function runSourceIngest(sourceId: string): Promise<{
  chunkCount: number
  sourceType: Source["type"]
  summary: string | null
}> {
  const source = await getSourceById(sourceId)
  if (!source) {
    throw new Error("Source not found")
  }

  let chunkCount = 0
  let text = ""
  if (source.type === "file") {
    const result = await ingestFileSource(source)
    chunkCount = result.chunkCount
    text = result.text
  } else if (source.type === "web") {
    const result = await ingestWebSource(source)
    chunkCount = result.chunkCount
    text = result.text
  } else if (source.type === "youtube") {
    const result = await ingestYoutubeSource(source)
    chunkCount = result.chunkCount
    text = result.text
  } else {
    throw new Error(`Unsupported source type: ${source.type}`)
  }

  let summary: string | null = null
  try {
    summary = await generateSourceSummary(source.title, text)
  } catch {
    summary = null
  }

  await setSourceReady(sourceId, summary)

  try {
    await refreshWorkspaceSummary(source.workspaceId, source.ownerId)
  } catch {
    void 0
  }

  return { chunkCount, sourceType: source.type, summary }
}

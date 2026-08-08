import { chunkParsedDocument, chunkPlainText } from "@/server/ingest/chunk"
import { upsertSourceChunks } from "@/server/ingest/embed"
import { saveExtractedText } from "@/server/ingest/finalize"
import {
  extensionFromFileName,
  extensionFromMimeType,
  parseFileBuffer,
} from "@/server/ingest/parse"
import { scrapeWebPage } from "@/server/integrations/firecrawl"
import { downloadImageKitFile } from "@/server/integrations/imagekit"
import { fetchYoutubeTranscriptText } from "@/server/integrations/youtube"
import type { Source } from "@/server/models/source"
import { getSourceById, setSourceStatus } from "@/server/sources/service"

async function ingestFileSource(source: Source): Promise<number> {
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
  return result.count
}

async function ingestWebSource(source: Source): Promise<number> {
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
  return result.count
}

async function ingestYoutubeSource(source: Source): Promise<number> {
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
  return result.count
}

export async function runSourceIngest(sourceId: string): Promise<{
  chunkCount: number
  sourceType: Source["type"]
}> {
  const source = await getSourceById(sourceId)
  if (!source) {
    throw new Error("Source not found")
  }

  let chunkCount = 0
  if (source.type === "file") {
    chunkCount = await ingestFileSource(source)
  } else if (source.type === "web") {
    chunkCount = await ingestWebSource(source)
  } else if (source.type === "youtube") {
    chunkCount = await ingestYoutubeSource(source)
  } else {
    throw new Error(`Unsupported source type: ${source.type}`)
  }

  await setSourceStatus(sourceId, "ready")

  return { chunkCount, sourceType: source.type }
}

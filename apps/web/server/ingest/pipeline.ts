import { chunkParsedDocument, chunkPlainText } from "@/server/ingest/chunk"
import type { SourceChunk } from "@/server/ingest/chunk"
import { upsertSourceChunks } from "@/server/ingest/embed"
import {
  extensionFromFileName,
  extensionFromMimeType,
  parseFileBuffer,
} from "@/server/ingest/parse"
import type { ParsedDocument } from "@/server/ingest/parse"
import {
  generateSourceSummary,
  refreshWorkspaceSummary,
} from "@/server/ingest/summarize"
import { scrapeWebPage } from "@/server/integrations/firecrawl"
import { downloadImageKitFile } from "@/server/integrations/imagekit"
import { fetchYoutubeTranscriptText } from "@/server/integrations/youtube"
import type { Source } from "@/server/models/source"
import {
  getSourceById,
  saveIngestExtractedContent,
  setIngestStage,
  setSourceReady,
} from "@/server/sources/service"

function toParsedDocument(source: Source): ParsedDocument | null {
  if (!source.ingestParsedSections || source.ingestParsedSections.length === 0) {
    return null
  }

  return {
    text: source.extractedText ?? "",
    sections: source.ingestParsedSections,
  }
}

export async function extractSourceContent(sourceId: string): Promise<{
  text: string
}> {
  const source = await getSourceById(sourceId)
  if (!source) {
    throw new Error("Source not found")
  }

  if (source.type === "file") {
    if (!source.imageKitUrl) {
      throw new Error("Source file URL missing")
    }

    const extension =
      (source.fileName ? extensionFromFileName(source.fileName) : null) ??
      extensionFromMimeType(source.mimeType)

    if (!extension) {
      throw new Error("Unsupported or unknown file type")
    }

    await setIngestStage(sourceId, "downloading")
    const bytes = await downloadImageKitFile(source.imageKitUrl)

    await setIngestStage(sourceId, "parsing")
    const parsed = await parseFileBuffer(bytes, extension)
    await saveIngestExtractedContent(sourceId, {
      text: parsed.text,
      ingestParsedSections: parsed.sections,
    })

    return { text: parsed.text }
  }

  await setIngestStage(sourceId, "parsing")

  if (source.type === "web") {
    if (!source.url) {
      throw new Error("Source URL missing")
    }

    const text = await scrapeWebPage(source.url)
    await saveIngestExtractedContent(sourceId, {
      text,
      ingestParsedSections: null,
    })
    return { text }
  }

  if (source.type === "youtube") {
    if (!source.url) {
      throw new Error("Source URL missing")
    }

    const text = await fetchYoutubeTranscriptText(source.url)
    await saveIngestExtractedContent(sourceId, {
      text,
      ingestParsedSections: null,
    })
    return { text }
  }

  throw new Error(`Unsupported source type: ${source.type}`)
}

async function buildSourceChunks(source: Source): Promise<SourceChunk[]> {
  const parsed = toParsedDocument(source)
  if (parsed) {
    return chunkParsedDocument(parsed)
  }

  const text = source.extractedText?.trim()
  if (!text) {
    throw new Error("Extracted text is missing")
  }

  return chunkPlainText(text)
}

export async function chunkSourceContent(sourceId: string): Promise<SourceChunk[]> {
  const source = await getSourceById(sourceId)
  if (!source) {
    throw new Error("Source not found")
  }

  await setIngestStage(sourceId, "chunking")
  return buildSourceChunks(source)
}

export async function embedSourceContent(sourceId: string): Promise<{
  chunkCount: number
}> {
  const source = await getSourceById(sourceId)
  if (!source) {
    throw new Error("Source not found")
  }

  const chunks = await buildSourceChunks(source)

  await setIngestStage(sourceId, "embedding")

  const result = await upsertSourceChunks({
    workspaceId: source.workspaceId,
    sourceId,
    chunks,
  })

  return { chunkCount: result.count }
}

export async function summarizeSourceContent(
  sourceId: string,
  text: string
): Promise<string | null> {
  const source = await getSourceById(sourceId)
  if (!source) {
    throw new Error("Source not found")
  }

  await setIngestStage(sourceId, "summarizing")

  try {
    return await generateSourceSummary(source.title, text)
  } catch {
    return null
  }
}

export async function finalizeSourceIngest(
  sourceId: string,
  summary: string | null
): Promise<void> {
  const source = await getSourceById(sourceId)
  if (!source) {
    throw new Error("Source not found")
  }

  await setIngestStage(sourceId, "indexing")
  await setSourceReady(sourceId, summary)

  try {
    await refreshWorkspaceSummary(source.workspaceId, source.ownerId)
  } catch {
    void 0
  }
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

  const extracted = await extractSourceContent(sourceId)
  const chunks = await chunkSourceContent(sourceId)
  const embedded = await embedSourceContent(sourceId)
  const summary = await summarizeSourceContent(sourceId, extracted.text)
  await finalizeSourceIngest(sourceId, summary)

  return {
    chunkCount: embedded.chunkCount,
    sourceType: source.type,
    summary,
  }
}

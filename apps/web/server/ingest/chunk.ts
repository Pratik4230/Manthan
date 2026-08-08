import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"

import type { ParsedDocument, ParsedSection } from "@/server/ingest/parse/types"

export const CHUNK_SIZE = 1000
export const CHUNK_OVERLAP = 200
export const PAGE_CHUNK_THRESHOLD = 1200
export const CROSS_PAGE_OVERLAP = 150

export type SourceChunkLoc = {
  chunkIndex: number
  page?: number
  sheet?: string
  sectionIndex?: number
  pageChunkIndex?: number
}

export type SourceChunk = {
  text: string
  loc: SourceChunkLoc
}

function createSplitter() {
  return new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  })
}

function tailOverlap(text: string, size: number): string {
  const trimmed = text.trim()
  if (!trimmed || size <= 0) {
    return ""
  }
  if (trimmed.length <= size) {
    return trimmed
  }
  return trimmed.slice(-size)
}

async function splitLongText(text: string): Promise<string[]> {
  const splitter = createSplitter()
  const parts = await splitter.splitText(text)
  return parts.map((part) => part.trim()).filter(Boolean)
}

async function chunkSection(
  section: ParsedSection,
  bridgePrefix: string
): Promise<Array<{ text: string; loc: Omit<SourceChunkLoc, "chunkIndex"> }>> {
  const body = section.text.trim()
  if (!body) {
    return []
  }

  const withBridge =
    bridgePrefix && section.loc.page != null
      ? `${bridgePrefix}\n\n${body}`
      : body

  const pieces =
    withBridge.length <= PAGE_CHUNK_THRESHOLD
      ? [withBridge]
      : await splitLongText(withBridge)

  return pieces.map((text, pageChunkIndex) => ({
    text,
    loc: {
      page: section.loc.page,
      sheet: section.loc.sheet,
      sectionIndex: section.loc.sectionIndex,
      pageChunkIndex:
        section.loc.page != null || pieces.length > 1
          ? pageChunkIndex
          : undefined,
    },
  }))
}

export async function chunkParsedDocument(
  document: ParsedDocument
): Promise<SourceChunk[]> {
  const sections = document.sections
    .map((section) => ({
      ...section,
      text: section.text.trim(),
    }))
    .filter((section) => section.text.length > 0)

  if (sections.length === 0) {
    throw new Error("No text sections to chunk")
  }

  const hasPages = sections.some((section) => section.loc.page != null)
  const chunks: SourceChunk[] = []
  let previousSectionText = ""

  for (const section of sections) {
    const bridge =
      hasPages && section.loc.page != null && previousSectionText
        ? tailOverlap(previousSectionText, CROSS_PAGE_OVERLAP)
        : ""

    const sectionChunks = await chunkSection(section, bridge)
    for (const chunk of sectionChunks) {
      chunks.push({
        text: chunk.text,
        loc: {
          ...chunk.loc,
          chunkIndex: chunks.length,
        },
      })
    }

    previousSectionText = section.text
  }

  if (chunks.length === 0) {
    throw new Error("Chunking produced no chunks")
  }

  return chunks
}

export async function chunkPlainText(text: string): Promise<SourceChunk[]> {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error("No text to chunk")
  }

  return chunkParsedDocument({
    text: trimmed,
    sections: [{ text: trimmed, loc: { sectionIndex: 0 } }],
  })
}

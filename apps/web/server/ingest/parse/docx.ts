import mammoth from "mammoth"

import {
  joinSections,
  type ParsedDocument,
} from "@/server/ingest/parse/types"

export async function parseDocx(data: Uint8Array): Promise<ParsedDocument> {
  const result = await mammoth.extractRawText({
    buffer: Buffer.from(data),
  })
  const text = result.value.trim()

  if (!text) {
    throw new Error("DOCX has no extractable text")
  }

  const sections = [{ text, loc: { sectionIndex: 0 } }]

  return {
    text: joinSections(sections),
    sections,
  }
}

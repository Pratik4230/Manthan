import {
  joinSections,
  type ParsedDocument,
} from "@/server/ingest/parse/types"

export function parsePlainText(data: Uint8Array): ParsedDocument {
  const text = new TextDecoder("utf-8").decode(data).trim()

  if (!text) {
    throw new Error("Text file is empty")
  }

  const sections = [{ text, loc: { sectionIndex: 0 } }]

  return {
    text: joinSections(sections),
    sections,
  }
}

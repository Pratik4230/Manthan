import { extractText, getDocumentProxy } from "unpdf"

import {
  joinSections,
  type ParsedDocument,
  type ParsedSection,
} from "@/server/ingest/parse/types"

export async function parsePdf(data: Uint8Array): Promise<ParsedDocument> {
  const pdf = await getDocumentProxy(data)
  const { text, totalPages } = await extractText(pdf, { mergePages: false })
  const pages = Array.isArray(text) ? text : [text]

  const sections: ParsedSection[] = pages
    .map((pageText, index) => ({
      text: pageText.trim(),
      loc: { page: index + 1, sectionIndex: index },
    }))
    .filter((section) => section.text.length > 0)

  if (sections.length === 0) {
    throw new Error(
      totalPages > 0
        ? "PDF has pages but no extractable text"
        : "PDF has no pages"
    )
  }

  return {
    text: joinSections(sections),
    sections,
  }
}

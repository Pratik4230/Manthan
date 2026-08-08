import Papa from "papaparse"

import {
  joinSections,
  type ParsedDocument,
} from "@/server/ingest/parse/types"

export function parseCsv(data: Uint8Array): ParsedDocument {
  const raw = new TextDecoder("utf-8").decode(data)
  const parsed = Papa.parse<string[]>(raw, {
    skipEmptyLines: "greedy",
  })

  if (parsed.errors.length > 0) {
    const first = parsed.errors[0]
    throw new Error(first?.message || "CSV parse failed")
  }

  const lines = parsed.data
    .map((row) =>
      row
        .map((cell) => String(cell ?? "").trim())
        .filter(Boolean)
        .join("\t")
    )
    .filter(Boolean)

  const text = lines.join("\n").trim()
  if (!text) {
    throw new Error("CSV has no extractable text")
  }

  const sections = [{ text, loc: { sectionIndex: 0 } }]

  return {
    text: joinSections(sections),
    sections,
  }
}

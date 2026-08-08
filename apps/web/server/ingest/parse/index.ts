import type { AllowedFileExtension } from "@/server/models/source"
import { parseDocx } from "@/server/ingest/parse/docx"
import { parsePdf } from "@/server/ingest/parse/pdf"
import { parsePlainText } from "@/server/ingest/parse/plain"
import { parseCsv } from "@/server/ingest/parse/csv"
import type { ParsedDocument } from "@/server/ingest/parse/types"
import { parseXlsx } from "@/server/ingest/parse/xlsx"

export type { ParsedDocument, ParsedSection, ParsedSectionLoc } from "@/server/ingest/parse/types"

export function extensionFromFileName(fileName: string): AllowedFileExtension | null {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)
  const ext = match?.[1]
  if (
    ext === "pdf" ||
    ext === "docx" ||
    ext === "xlsx" ||
    ext === "csv" ||
    ext === "txt" ||
    ext === "md"
  ) {
    return ext
  }
  return null
}

export function extensionFromMimeType(
  mimeType: string | null | undefined
): AllowedFileExtension | null {
  switch (mimeType) {
    case "application/pdf":
      return "pdf"
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "docx"
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return "xlsx"
    case "text/csv":
    case "application/csv":
      return "csv"
    case "text/plain":
      return "txt"
    case "text/markdown":
      return "md"
    default:
      return null
  }
}

export async function parseFileBuffer(
  data: Uint8Array,
  extension: AllowedFileExtension
): Promise<ParsedDocument> {
  switch (extension) {
    case "pdf":
      return parsePdf(data)
    case "docx":
      return parseDocx(data)
    case "xlsx":
      return parseXlsx(data)
    case "csv":
      return parseCsv(data)
    case "txt":
    case "md":
      return parsePlainText(data)
    default: {
      const _exhaustive: never = extension
      throw new Error(`Unsupported file type: ${_exhaustive}`)
    }
  }
}

import {
  ALLOWED_FILE_EXTENSIONS,
  type AllowedFileExtension,
} from "@/server/models/source"

const EXT_MIME: Record<AllowedFileExtension, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  txt: "text/plain",
  md: "text/markdown",
}

export function getFileExtension(fileName: string): AllowedFileExtension | null {
  const parts = fileName.toLowerCase().split(".")
  const ext = parts.length > 1 ? parts.at(-1) : null
  if (!ext) {
    return null
  }
  return (ALLOWED_FILE_EXTENSIONS as readonly string[]).includes(ext)
    ? (ext as AllowedFileExtension)
    : null
}

export function resolveMimeType(
  file: File,
  extension: AllowedFileExtension
): string {
  if (file.type && file.type !== "application/octet-stream") {
    if (extension === "csv" && file.type === "application/vnd.ms-excel") {
      return "text/csv"
    }
    if (extension === "md" && file.type === "text/plain") {
      return "text/markdown"
    }
    return file.type
  }
  return EXT_MIME[extension]
}

export function isAllowedMimeType(mimeType: string): boolean {
  return (
    mimeType === "application/pdf" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "text/csv" ||
    mimeType === "application/csv" ||
    mimeType === "text/plain" ||
    mimeType === "text/markdown"
  )
}

export const ACCEPT_FILE_TYPES =
  ".pdf,.docx,.xlsx,.csv,.txt,.md,application/pdf,text/plain,text/markdown,text/csv"

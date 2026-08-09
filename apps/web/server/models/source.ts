export const SOURCE_STATUSES = [
  "pending",
  "processing",
  "ready",
  "failed",
] as const

export type SourceStatus = (typeof SOURCE_STATUSES)[number]

export const INGEST_STAGES = [
  "queued",
  "downloading",
  "parsing",
  "chunking",
  "embedding",
  "summarizing",
  "indexing",
] as const

export type IngestStage = (typeof INGEST_STAGES)[number]

export const SOURCE_TYPES = ["file", "youtube", "web"] as const

export type SourceType = (typeof SOURCE_TYPES)[number]

export type SourceIngestParsedSection = {
  text: string
  loc: {
    page?: number
    sheet?: string
    sectionIndex?: number
  }
}

export type SourceDocument = {
  workspaceId: string
  ownerId: string
  type: SourceType
  title: string
  status: SourceStatus
  ingestStage: IngestStage | null
  error: string | null
  enabled: boolean
  mimeType: string | null
  fileName: string | null
  fileSize: number | null
  imageKitFileId: string | null
  imageKitUrl: string | null
  url: string | null
  youtubeVideoId: string | null
  contentSha256: string | null
  extractedText: string | null
  ingestParsedSections: SourceIngestParsedSection[] | null
  summary: string | null
  createdAt: Date
  updatedAt: Date
}

export type Source = SourceDocument & {
  _id: import("mongodb").ObjectId
}

export const ALLOWED_FILE_EXTENSIONS = [
  "pdf",
  "docx",
  "xlsx",
  "csv",
  "txt",
  "md",
] as const

export type AllowedFileExtension = (typeof ALLOWED_FILE_EXTENSIONS)[number]

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "text/markdown",
  "application/csv",
] as const

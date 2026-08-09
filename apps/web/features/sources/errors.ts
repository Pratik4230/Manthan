import type { SourceDto } from "@/server/sources/service"

export class DuplicateSourceError extends Error {
  existingSource: SourceDto

  constructor(existingSource: SourceDto) {
    super("This source already exists in this workspace.")
    this.name = "DuplicateSourceError"
    this.existingSource = existingSource
  }
}

export function isDuplicateSourceError(
  error: unknown
): error is DuplicateSourceError {
  return error instanceof DuplicateSourceError
}

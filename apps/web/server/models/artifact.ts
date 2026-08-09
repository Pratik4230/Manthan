export const ARTIFACT_TYPES = [
  "briefing",
  "faq",
  "flashcards",
  "quiz",
  "mind_map",
] as const

export type ArtifactType = (typeof ARTIFACT_TYPES)[number]

export const ARTIFACT_STATUSES = [
  "pending",
  "processing",
  "ready",
  "failed",
] as const

export type ArtifactStatus = (typeof ARTIFACT_STATUSES)[number]

export type ArtifactDocument = {
  workspaceId: string
  ownerId: string
  type: ArtifactType
  title: string
  status: ArtifactStatus
  error: string | null
  content: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

export type Artifact = ArtifactDocument & {
  _id: import("mongodb").ObjectId
}

export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  briefing: "Briefing",
  faq: "FAQ",
  flashcards: "Flashcards",
  quiz: "Quiz",
  mind_map: "Mind map",
}

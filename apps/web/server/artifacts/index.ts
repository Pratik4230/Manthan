export { getArtifactsCollection } from "@/server/artifacts/collection"
export { generateArtifactContent, artifactContentToMarkdown } from "@/server/artifacts/generate"
export {
  createArtifact,
  deleteArtifact,
  getArtifact,
  getArtifactById,
  listArtifacts,
  regenerateArtifact,
  setArtifactReady,
  setArtifactStatus,
  type ArtifactDto,
} from "@/server/artifacts/service"
export {
  createArtifactInputSchema,
  type CreateArtifactInput,
} from "@/server/artifacts/validations"

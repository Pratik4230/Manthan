import { z } from "zod"

import { ARTIFACT_TYPES } from "@/server/models/artifact"

export const createArtifactInputSchema = z.object({
  type: z.enum(ARTIFACT_TYPES),
})

export type CreateArtifactInput = z.infer<typeof createArtifactInputSchema>

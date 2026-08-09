import type { InngestFunction } from "inngest"

import { generateArtifact } from "@/server/inngest/functions/generate-artifact"
import { ingestSource } from "@/server/inngest/functions/ingest-source"

export const functions: InngestFunction.Any[] = [
  ingestSource,
  generateArtifact,
]

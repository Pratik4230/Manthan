import type { InngestFunction } from "inngest"

import { ingestSource } from "@/server/inngest/functions/ingest-source"

export const functions: InngestFunction.Any[] = [ingestSource]

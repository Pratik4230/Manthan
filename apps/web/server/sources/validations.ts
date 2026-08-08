import { z } from "zod"

import {
  ALLOWED_FILE_EXTENSIONS,
  ALLOWED_MIME_TYPES,
} from "@/server/models/source"

export const createFileSourceInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  fileName: z.string().trim().min(1).max(255),
  fileSize: z.number().int().positive().max(50 * 1024 * 1024),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  imageKitFileId: z.string().trim().min(1),
  imageKitUrl: z.string().url(),
  extension: z.enum(ALLOWED_FILE_EXTENSIONS),
})

export type CreateFileSourceInput = z.infer<typeof createFileSourceInputSchema>

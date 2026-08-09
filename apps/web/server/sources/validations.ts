import { z } from "zod"

import { isYoutubeUrl } from "@/lib/youtube-url"
import {
  ALLOWED_FILE_EXTENSIONS,
  ALLOWED_MIME_TYPES,
} from "@/server/models/source"

const sourceDedupFields = {
  forceDuplicate: z.boolean().optional(),
  replaceSourceId: z.string().trim().optional(),
}

export const createFileSourceInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  fileName: z.string().trim().min(1).max(255),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  imageKitFileId: z.string().trim().min(1),
  imageKitUrl: z.string().url(),
  extension: z.enum(ALLOWED_FILE_EXTENSIONS),
  clientContentHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/i, "Invalid content hash")
    .optional(),
  ...sourceDedupFields,
})

export type CreateFileSourceInput = z.infer<typeof createFileSourceInputSchema>

export const createWebSourceInputSchema = z.object({
  url: z
    .url("Enter a valid URL")
    .trim()
    .refine((value) => {
      try {
        const parsed = new URL(value)
        return parsed.protocol === "http:" || parsed.protocol === "https:"
      } catch {
        return false
      }
    }, "URL must start with http:// or https://"),
  title: z.string().trim().min(1).max(200).optional(),
  ...sourceDedupFields,
})

export type CreateWebSourceInput = z.infer<typeof createWebSourceInputSchema>

export const createYoutubeSourceInputSchema = z.object({
  url: z
    .url("Enter a valid URL")
    .trim()
    .refine((value) => isYoutubeUrl(value), "Enter a valid YouTube URL"),
  title: z.string().trim().min(1).max(200).optional(),
  ...sourceDedupFields,
})

export type CreateYoutubeSourceInput = z.infer<
  typeof createYoutubeSourceInputSchema
>

import { z } from "zod"

import { isYoutubeUrl } from "@/lib/youtube-url"

export const addWebSourceSchema = z.object({
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
})

export const addYoutubeSourceSchema = z.object({
  url: z
    .url("Enter a valid URL")
    .trim()
    .refine((value) => isYoutubeUrl(value), "Enter a valid YouTube URL"),
})

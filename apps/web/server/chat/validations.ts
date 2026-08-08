import { z } from "zod"

export const updateThreadInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200).nullable().optional(),
    status: z.enum(["regular", "archived"]).optional(),
  })
  .refine(
    (value) => value.title !== undefined || value.status !== undefined,
    { message: "No updates provided" }
  )

export const appendMessageInputSchema = z.object({
  messageId: z.string().trim().min(1),
  parentId: z.string().trim().min(1).nullable(),
  message: z.record(z.string(), z.unknown()),
})

export type UpdateThreadInput = z.infer<typeof updateThreadInputSchema>
export type AppendMessageInput = z.infer<typeof appendMessageInputSchema>

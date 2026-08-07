import { z } from "zod"

export const createWorkspaceInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  instructions: z.string().max(5000).optional(),
})

export const updateWorkspaceInputSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  instructions: z.string().max(5000).optional(),
})

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceInputSchema>
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceInputSchema>

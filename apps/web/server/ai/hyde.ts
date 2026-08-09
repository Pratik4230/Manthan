import { z } from "zod"

import { createInternalChatModel } from "@/server/integrations/openai"

const hydeSchema = z.object({
  hypotheticalPassage: z
    .string()
    .describe(
      "Two to four sentences shaped like a passage that might appear in the user's sources if it answered the query. Generic wording only; no specific facts, numbers, or names."
    ),
})

export async function generateHydePassage(searchQuery: string): Promise<string> {
  const trimmed = searchQuery.trim()
  if (!trimmed) {
    return ""
  }

  const model = createInternalChatModel().withStructuredOutput(hydeSchema)

  const result = await model.invoke([
    {
      role: "system",
      content: [
        "Generate a short hypothetical document excerpt for HyDE retrieval.",
        "Describe the kind of passage that would answer the query if it existed in the user's sources.",
        "Do not state specific facts, dates, figures, or proper nouns.",
        "Use neutral, topic-level language only.",
      ].join(" "),
    },
    {
      role: "user",
      content: `Search query:\n${trimmed}`,
    },
  ])

  const parsed = hydeSchema.parse(result)
  return parsed.hypotheticalPassage.trim()
}

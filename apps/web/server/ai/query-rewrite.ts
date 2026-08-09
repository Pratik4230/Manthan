import { z } from "zod"

import { createInternalChatModel } from "@/server/integrations/openai"

const rewriteSchema = z.object({
  searchQuery: z
    .string()
    .describe(
      "A standalone search query for vector retrieval: fix spelling, expand abbreviations, resolve pronouns from context. Do not add facts."
    ),
})

export async function rewriteSearchQuery(input: {
  threadText: string
  lastUserMessage: string
}): Promise<string> {
  const trimmed = input.lastUserMessage.trim()
  if (!trimmed) {
    return ""
  }

  const model = createInternalChatModel().withStructuredOutput(rewriteSchema)

  const result = await model.invoke([
    {
      role: "system",
      content: [
        "Rewrite the user's latest message into one clear search query for semantic retrieval over their workspace sources.",
        "Use conversation context to resolve pronouns and vague references.",
        "Fix spelling and grammar.",
        "Do not introduce facts, names, or topics that the user did not imply.",
        "Output a single concise query string.",
      ].join(" "),
    },
    {
      role: "user",
      content: `Conversation:\n${input.threadText || "(no prior messages)"}\n\nLatest user message:\n${trimmed}`,
    },
  ])

  const parsed = rewriteSchema.parse(result)
  const query = parsed.searchQuery.trim()
  return query || trimmed
}

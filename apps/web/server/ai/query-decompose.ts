import { z } from "zod"

import { createInternalChatModel } from "@/server/integrations/openai"

export const MAX_SUB_QUERIES = 3

const decomposeSchema = z.object({
  subQueries: z
    .array(z.string())
    .max(MAX_SUB_QUERIES)
    .describe(
      "Distinct search sub-queries, each answerable from workspace sources. Maximum 3."
    ),
})

export async function decomposeSearchQueries(input: {
  threadText: string
  lastUserMessage: string
  rewrittenQuery: string
}): Promise<string[]> {
  const model = createInternalChatModel().withStructuredOutput(decomposeSchema)

  const result = await model.invoke([
    {
      role: "system",
      content: [
        "Split a compound research question into at most 3 standalone search queries.",
        "Each sub-query must be self-contained and suitable for vector search.",
        "Do not add facts. Preserve the user's intent.",
        "If the question is already single-topic, return one sub-query equal to the rewritten query.",
      ].join(" "),
    },
    {
      role: "user",
      content: [
        `Conversation:\n${input.threadText || "(no prior messages)"}`,
        `Latest user message:\n${input.lastUserMessage.trim()}`,
        `Rewritten query:\n${input.rewrittenQuery.trim()}`,
      ].join("\n\n"),
    },
  ])

  const parsed = decomposeSchema.parse(result)
  const unique = [
    ...new Set(
      parsed.subQueries.map((query) => query.trim()).filter((query) => query.length > 0)
    ),
  ].slice(0, MAX_SUB_QUERIES)

  if (unique.length === 0) {
    return [input.rewrittenQuery.trim()].filter(Boolean)
  }

  return unique
}

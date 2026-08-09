import { z } from "zod"

import { formatThreadForPrompt } from "@/server/ai/messages"
import { createInternalChatModel } from "@/server/integrations/openai"

const routingSchema = z.object({
  needsRetrieval: z
    .boolean()
    .describe(
      "True when the answer requires searching the user's uploaded workspace sources. False for greetings, thanks, meta questions about Manthan, or general knowledge not tied to their documents (e.g. today's date)."
    ),
  shouldDecompose: z
    .boolean()
    .describe(
      "True only when the user asks multiple distinct questions that should be searched separately. False for single-topic questions."
    ),
})

export type QueryRouting = z.infer<typeof routingSchema>

export async function routeQuery(input: {
  threadText: string
  lastUserMessage: string
}): Promise<QueryRouting> {
  const trimmed = input.lastUserMessage.trim()
  if (!trimmed) {
    return { needsRetrieval: false, shouldDecompose: false }
  }

  const model = createInternalChatModel().withStructuredOutput(routingSchema)

  const result = await model.invoke([
    {
      role: "system",
      content: [
        "You route user messages for a source-grounded research workspace.",
        "Decide whether vector search over the user's documents is required.",
        "Do not retrieve for social messages, app help, or general knowledge unrelated to their sources.",
        "Retrieve when the user asks about content, facts, summaries, comparisons, or anything that should come from their uploaded files, links, or transcripts.",
        "Set shouldDecompose only for clearly multi-part research questions with separate sub-questions.",
      ].join(" "),
    },
    {
      role: "user",
      content: `Conversation:\n${input.threadText || "(no prior messages)"}\n\nLatest user message:\n${trimmed}`,
    },
  ])

  return routingSchema.parse(result)
}

export function buildRoutingThreadText(
  messages: Parameters<typeof formatThreadForPrompt>[0]
): string {
  return formatThreadForPrompt(messages)
}

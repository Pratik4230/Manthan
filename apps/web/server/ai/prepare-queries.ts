import { decomposeSearchQueries } from "@/server/ai/query-decompose"
import { rewriteSearchQuery } from "@/server/ai/query-rewrite"
import { generateHydePassage } from "@/server/ai/hyde"
import { formatThreadForPrompt, lastUserText } from "@/server/ai/messages"

export type PreparedQueries = {
  searchQueries: string[]
  hydePassages: string[]
}

export async function prepareSearchQueries(input: {
  messages: Parameters<typeof formatThreadForPrompt>[0]
  shouldDecompose: boolean
}): Promise<PreparedQueries> {
  const threadText = formatThreadForPrompt(input.messages)
  const lastUserMessage = lastUserText(input.messages)

  const rewritten = await rewriteSearchQuery({
    threadText,
    lastUserMessage,
  })

  const searchQueries = input.shouldDecompose
    ? await decomposeSearchQueries({
        threadText,
        lastUserMessage,
        rewrittenQuery: rewritten,
      })
    : [rewritten].filter(Boolean)

  const hydePassages = await Promise.all(
    searchQueries.map((query) => generateHydePassage(query))
  )

  return { searchQueries, hydePassages }
}

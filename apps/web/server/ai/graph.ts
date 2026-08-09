import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages"
import {
  Annotation,
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph"

import { formatThreadForPrompt, lastUserText } from "@/server/ai/messages"
import { prepareSearchQueries } from "@/server/ai/prepare-queries"
import {
  buildConversationalSystemPrompt,
  buildSystemPrompt,
  buildUserPromptWithContext,
  formatRetrievedContext,
} from "@/server/ai/prompts"
import {
  buildRoutingThreadText,
  routeQuery,
} from "@/server/ai/query-routing"
import { createChatModel } from "@/server/integrations/openai"
import {
  mergeChunkHits,
  searchWorkspaceChunksWithHyde,
  type WorkspaceChunkHit,
} from "@/server/vector/retrieve"

export type RagCitation = {
  index: number
  sourceId: string
  loc: Record<string, unknown> | null
  text: string
  score: number
}

export const WorkspaceRagState = Annotation.Root({
  ...MessagesAnnotation.spec,
  workspaceId: Annotation<string>(),
  sourceIds: Annotation<string[] | undefined>(),
  instructions: Annotation<string | undefined>(),
  needsRetrieval: Annotation<boolean>({
    reducer: (_current, update) => update,
    default: () => true,
  }),
  shouldDecompose: Annotation<boolean>({
    reducer: (_current, update) => update,
    default: () => false,
  }),
  searchQueries: Annotation<string[]>({
    reducer: (_current, update) => update,
    default: () => [],
  }),
  hydePassages: Annotation<string[]>({
    reducer: (_current, update) => update,
    default: () => [],
  }),
  hits: Annotation<WorkspaceChunkHit[]>({
    reducer: (_current, update) => update,
    default: () => [],
  }),
  citations: Annotation<RagCitation[]>({
    reducer: (_current, update) => update,
    default: () => [],
  }),
})

async function route(state: typeof WorkspaceRagState.State) {
  const lastUserMessage = lastUserText(state.messages).trim()
  if (!lastUserMessage) {
    return { needsRetrieval: false, shouldDecompose: false }
  }

  const routing = await routeQuery({
    threadText: buildRoutingThreadText(state.messages),
    lastUserMessage,
  })

  return {
    needsRetrieval: routing.needsRetrieval,
    shouldDecompose: routing.shouldDecompose,
  }
}

function routeAfterClassification(state: typeof WorkspaceRagState.State) {
  return state.needsRetrieval ? "prepare_queries" : "generate_conversational"
}

async function prepareQueries(state: typeof WorkspaceRagState.State) {
  const prepared = await prepareSearchQueries({
    messages: state.messages,
    shouldDecompose: state.shouldDecompose,
  })

  return {
    searchQueries: prepared.searchQueries,
    hydePassages: prepared.hydePassages,
  }
}

async function retrieve(state: typeof WorkspaceRagState.State) {
  if (!state.workspaceId || state.searchQueries.length === 0) {
    return { hits: [] as WorkspaceChunkHit[] }
  }

  const batches = await Promise.all(
    state.searchQueries.map((query, index) =>
      searchWorkspaceChunksWithHyde({
        workspaceId: state.workspaceId,
        query,
        hydePassage: state.hydePassages[index],
        sourceIds: state.sourceIds,
      })
    )
  )

  return { hits: mergeChunkHits(batches) }
}

async function generate(state: typeof WorkspaceRagState.State) {
  const question = lastUserText(state.messages).trim()
  if (!question) {
    return {
      messages: [new AIMessage("Ask a question about your workspace sources.")],
    }
  }

  if (state.hits.length === 0) {
    return {
      messages: [
        new AIMessage(
          "I could not find relevant information in the enabled sources for this workspace."
        ),
      ],
    }
  }

  const model = createChatModel({ streaming: true })
  const stream = await model.stream([
    new SystemMessage(buildSystemPrompt(state.instructions)),
    new HumanMessage(
      buildUserPromptWithContext(question, formatRetrievedContext(state.hits))
    ),
  ])

  let text = ""
  for await (const chunk of stream) {
    text += chunk.text
  }

  return { messages: [new AIMessage(text)] }
}

async function generateConversational(state: typeof WorkspaceRagState.State) {
  const question = lastUserText(state.messages).trim()
  if (!question) {
    return {
      messages: [new AIMessage("Ask a question about your workspace sources.")],
    }
  }

  const threadText = formatThreadForPrompt(state.messages.slice(0, -1))
  const userContent = threadText
    ? `Conversation so far:\n${threadText}\n\nLatest message:\n${question}`
    : question

  const model = createChatModel({ streaming: true })
  const stream = await model.stream([
    new SystemMessage(buildConversationalSystemPrompt(state.instructions)),
    new HumanMessage(userContent),
  ])

  let text = ""
  for await (const chunk of stream) {
    text += chunk.text
  }

  return { messages: [new AIMessage(text)] }
}

function cite(state: typeof WorkspaceRagState.State) {
  const last = state.messages.at(-1)
  const answer = last && AIMessage.isInstance(last) ? last.text : ""
  const referenced = new Set<number>()
  for (const match of answer.matchAll(/\[(\d+)\]/g)) {
    referenced.add(Number(match[1]))
  }

  const citations: RagCitation[] = state.hits.map((hit, index) => ({
    index: index + 1,
    sourceId: hit.sourceId,
    loc: hit.loc,
    text: hit.text,
    score: hit.score,
  }))

  return {
    citations:
      referenced.size > 0
        ? citations.filter((citation) => referenced.has(citation.index))
        : citations,
  }
}

export function createWorkspaceRagGraph() {
  return new StateGraph(WorkspaceRagState)
    .addNode("route", route)
    .addNode("prepare_queries", prepareQueries)
    .addNode("retrieve", retrieve)
    .addNode("generate", generate)
    .addNode("generate_conversational", generateConversational)
    .addNode("cite", cite)
    .addEdge(START, "route")
    .addConditionalEdges("route", routeAfterClassification, {
      prepare_queries: "prepare_queries",
      generate_conversational: "generate_conversational",
    })
    .addEdge("prepare_queries", "retrieve")
    .addEdge("retrieve", "generate")
    .addEdge("generate", "cite")
    .addEdge("generate_conversational", END)
    .addEdge("cite", END)
    .compile()
}

export const workspaceRagGraph = createWorkspaceRagGraph()

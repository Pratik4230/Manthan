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

import {
  buildSystemPrompt,
  buildUserPromptWithContext,
  formatRetrievedContext,
} from "@/server/ai/prompts"
import { createChatModel } from "@/server/integrations/openai"
import {
  searchWorkspaceChunks,
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
  hits: Annotation<WorkspaceChunkHit[]>({
    reducer: (_current, update) => update,
    default: () => [],
  }),
  citations: Annotation<RagCitation[]>({
    reducer: (_current, update) => update,
    default: () => [],
  }),
})

function lastUserText(
  messages: (typeof WorkspaceRagState.State)["messages"]
): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (!message || !HumanMessage.isInstance(message)) {
      continue
    }
    return message.text
  }
  return ""
}

async function retrieve(state: typeof WorkspaceRagState.State) {
  const query = lastUserText(state.messages).trim()
  if (!query || !state.workspaceId) {
    return { hits: [] as WorkspaceChunkHit[] }
  }

  const hits = await searchWorkspaceChunks({
    workspaceId: state.workspaceId,
    query,
    sourceIds: state.sourceIds,
  })

  return { hits }
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

  const model = createChatModel()
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
    .addNode("retrieve", retrieve)
    .addNode("generate", generate)
    .addNode("cite", cite)
    .addEdge(START, "retrieve")
    .addEdge("retrieve", "generate")
    .addEdge("generate", "cite")
    .addEdge("cite", END)
    .compile()
}

export const workspaceRagGraph = createWorkspaceRagGraph()

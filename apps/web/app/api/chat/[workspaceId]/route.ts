import { AIMessage, HumanMessage } from "@langchain/core/messages"
import { createAssistantStreamResponse } from "assistant-stream"
import { NextResponse } from "next/server"

import {
  CITATIONS_DATA_NAME,
  enrichCitations,
} from "@/server/ai/citations"
import {
  workspaceRagGraph,
  type RagCitation,
} from "@/server/ai/graph"
import { requireSession } from "@/server/auth/session"
import { listEnabledReadySourceIds } from "@/server/sources/service"
import { getWorkspace } from "@/server/workspaces/service"

type RouteContext = {
  params: Promise<{ workspaceId: string }>
}

type ChatMessagePart = {
  type?: string
  text?: string
}

type ChatMessage = {
  role?: string
  content?: string | ChatMessagePart[]
}

const STREAMABLE_GRAPH_NODES = new Set([
  "generate",
  "generate_conversational",
])

function extractMessageText(message: ChatMessage): string {
  const content = message.content
  if (typeof content === "string") {
    return content
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part
        }
        if (part?.type === "text" && typeof part.text === "string") {
          return part.text
        }
        return ""
      })
      .join("")
  }
  return ""
}

function lastUserText(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (!message || message.role !== "user") {
      continue
    }
    return extractMessageText(message)
  }
  return ""
}

function toLangChainMessages(messages: ChatMessage[]) {
  const result: Array<HumanMessage | AIMessage> = []
  for (const message of messages) {
    const text = extractMessageText(message).trim()
    if (!text) {
      continue
    }
    if (message.role === "user") {
      result.push(new HumanMessage(text))
      continue
    }
    if (message.role === "assistant") {
      result.push(new AIMessage(text))
    }
  }
  return result
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSession()
    const { workspaceId } = await context.params
    const workspace = await getWorkspace(session.user.id, workspaceId)

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      )
    }

    const body = (await request.json()) as { messages?: ChatMessage[] }
    const langChainMessages = toLangChainMessages(body.messages ?? [])
    const question = lastUserText(body.messages ?? []).trim()

    if (!question) {
      return NextResponse.json({ error: "Message required" }, { status: 400 })
    }

    const sourceIds = await listEnabledReadySourceIds(
      session.user.id,
      workspaceId
    )

    return createAssistantStreamResponse(async (controller) => {
      if (sourceIds.length === 0) {
        controller.appendText(
          "Add at least one ready source in the Sources panel, then ask again. I can only answer from enabled sources in this workspace."
        )
        return
      }

      let streamed = false
      let citations: RagCitation[] = []

      const events = workspaceRagGraph.streamEvents(
        {
          messages:
            langChainMessages.length > 0
              ? langChainMessages
              : [new HumanMessage(question)],
          workspaceId,
          sourceIds,
          instructions: workspace.instructions || undefined,
        },
        {
          version: "v2",
          signal: request.signal,
        }
      )

      for await (const event of events) {
        if (event.event === "on_chat_model_stream") {
          const node = event.metadata?.langgraph_node
          if (
            typeof node !== "string" ||
            !STREAMABLE_GRAPH_NODES.has(node)
          ) {
            continue
          }
          const chunk = event.data?.chunk as { text?: string } | undefined
          const delta = chunk?.text ?? ""
          if (delta) {
            streamed = true
            controller.appendText(delta)
          }
          continue
        }

        if (
          !streamed &&
          event.event === "on_chain_end" &&
          (event.metadata?.langgraph_node === "generate" ||
            event.metadata?.langgraph_node === "generate_conversational")
        ) {
          const output = event.data?.output as
            | { messages?: unknown[] }
            | undefined
          const last = output?.messages?.at(-1)
          if (last && AIMessage.isInstance(last) && last.text) {
            streamed = true
            controller.appendText(last.text)
          }
          continue
        }

        if (
          event.event === "on_chain_end" &&
          event.metadata?.langgraph_node === "cite"
        ) {
          const output = event.data?.output as
            | { citations?: RagCitation[] }
            | undefined
          citations = output?.citations ?? []
        }
      }

      if (citations.length > 0) {
        const payload = await enrichCitations(
          session.user.id,
          workspaceId,
          citations
        )
        controller.appendData({
          type: "data",
          name: CITATIONS_DATA_NAME,
          data: JSON.parse(JSON.stringify(payload)),
        })
      }
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json({ error: "Failed to chat" }, { status: 500 })
  }
}

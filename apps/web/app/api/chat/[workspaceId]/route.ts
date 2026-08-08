import { AIMessage, HumanMessage } from "@langchain/core/messages"
import { createAssistantStreamResponse } from "assistant-stream"
import { NextResponse } from "next/server"

import { workspaceRagGraph } from "@/server/ai/graph"
import { requireSession } from "@/server/auth/session"
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

function lastUserText(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (!message || message.role !== "user") {
      continue
    }
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
  }
  return ""
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
    const question = lastUserText(body.messages ?? []).trim()

    if (!question) {
      return NextResponse.json({ error: "Message required" }, { status: 400 })
    }

    return createAssistantStreamResponse(async (controller) => {
      let streamed = false

      const events = workspaceRagGraph.streamEvents(
        {
          messages: [new HumanMessage(question)],
          workspaceId,
          instructions: workspace.instructions || undefined,
        },
        {
          version: "v2",
          signal: request.signal,
        }
      )

      for await (const event of events) {
        if (event.event === "on_chat_model_stream") {
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
          event.metadata?.langgraph_node === "generate"
        ) {
          const output = event.data?.output as
            { messages?: unknown[] } | undefined
          const last = output?.messages?.at(-1)
          if (last && AIMessage.isInstance(last) && last.text) {
            streamed = true
            controller.appendText(last.text)
          }
        }
      }
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json({ error: "Failed to chat" }, { status: 500 })
  }
}

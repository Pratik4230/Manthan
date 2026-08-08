import { NextResponse } from "next/server"

import {
  appendThreadMessage,
  listThreadMessages,
} from "@/server/chat/service"
import { appendMessageInputSchema } from "@/server/chat/validations"
import { requireSession } from "@/server/auth/session"

type RouteContext = {
  params: Promise<{ workspaceId: string; threadId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession()
    const { workspaceId, threadId } = await context.params
    const messages = await listThreadMessages(
      session.user.id,
      workspaceId,
      threadId
    )

    if (!messages) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 })
    }

    return NextResponse.json({ messages })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json(
      { error: "Failed to list messages" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSession()
    const { workspaceId, threadId } = await context.params
    const body = await request.json()
    const parsed = appendMessageInputSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const message = await appendThreadMessage(
      session.user.id,
      workspaceId,
      threadId,
      parsed.data
    )

    if (!message) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 })
    }

    return NextResponse.json({ message })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json(
      { error: "Failed to append message" },
      { status: 500 }
    )
  }
}

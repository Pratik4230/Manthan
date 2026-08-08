import { NextResponse } from "next/server"

import {
  deleteThread,
  getThread,
  updateThread,
} from "@/server/chat/service"
import { updateThreadInputSchema } from "@/server/chat/validations"
import { requireSession } from "@/server/auth/session"

type RouteContext = {
  params: Promise<{ workspaceId: string; threadId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession()
    const { workspaceId, threadId } = await context.params
    const thread = await getThread(session.user.id, workspaceId, threadId)

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 })
    }

    return NextResponse.json({ thread })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json({ error: "Failed to get thread" }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireSession()
    const { workspaceId, threadId } = await context.params
    const body = await request.json()
    const parsed = updateThreadInputSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const thread = await updateThread(
      session.user.id,
      workspaceId,
      threadId,
      parsed.data
    )

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 })
    }

    return NextResponse.json({ thread })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json(
      { error: "Failed to update thread" },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession()
    const { workspaceId, threadId } = await context.params
    const deleted = await deleteThread(
      session.user.id,
      workspaceId,
      threadId
    )

    if (!deleted) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json(
      { error: "Failed to delete thread" },
      { status: 500 }
    )
  }
}

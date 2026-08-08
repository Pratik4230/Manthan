import { NextResponse } from "next/server"

import { createThread, listThreads } from "@/server/chat/service"
import { requireSession } from "@/server/auth/session"

type RouteContext = {
  params: Promise<{ workspaceId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession()
    const { workspaceId } = await context.params
    const threads = await listThreads(session.user.id, workspaceId)
    return NextResponse.json({ threads })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json({ error: "Failed to list threads" }, { status: 500 })
  }
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession()
    const { workspaceId } = await context.params
    const thread = await createThread(session.user.id, workspaceId)
    return NextResponse.json({ thread })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json(
      { error: "Failed to create thread" },
      { status: 500 }
    )
  }
}

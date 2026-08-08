import { NextResponse } from "next/server"

import { requireSession } from "@/server/auth/session"
import { deleteSource } from "@/server/sources/service"

type RouteContext = {
  params: Promise<{ workspaceId: string; sourceId: string }>
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession()
    const { workspaceId, sourceId } = await context.params
    const deleted = await deleteSource(
      session.user.id,
      workspaceId,
      sourceId
    )

    if (!deleted) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json({ error: "Failed to delete source" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"

import { requireSession } from "@/server/auth/session"
import {
  deleteWorkspace,
  getWorkspace,
  updateWorkspace,
} from "@/server/workspaces/service"
import { updateWorkspaceInputSchema } from "@/server/workspaces/validations"

type RouteContext = {
  params: Promise<{ workspaceId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession()
    const { workspaceId } = await context.params
    const workspace = await getWorkspace(session.user.id, workspaceId)

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    return NextResponse.json({ workspace })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json({ error: "Failed to get workspace" }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireSession()
    const { workspaceId } = await context.params
    const body = await request.json()
    const parsed = updateWorkspaceInputSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    if (
      parsed.data.title === undefined &&
      parsed.data.instructions === undefined
    ) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 })
    }

    const workspace = await updateWorkspace(
      session.user.id,
      workspaceId,
      parsed.data
    )

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    return NextResponse.json({ workspace })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json({ error: "Failed to update workspace" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession()
    const { workspaceId } = await context.params
    const deleted = await deleteWorkspace(session.user.id, workspaceId)

    if (!deleted) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json({ error: "Failed to delete workspace" }, { status: 500 })
  }
}

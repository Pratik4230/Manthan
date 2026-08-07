import { NextResponse } from "next/server"

import { requireSession } from "@/server/auth/session"
import {
  createWorkspace,
  listWorkspaces,
} from "@/server/workspaces/service"
import { createWorkspaceInputSchema } from "@/server/workspaces/validations"

export async function GET() {
  try {
    const session = await requireSession()
    const workspaces = await listWorkspaces(session.user.id)
    return NextResponse.json({ workspaces })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json({ error: "Failed to list workspaces" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const parsed = createWorkspaceInputSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const workspace = await createWorkspace(session.user.id, parsed.data)
    return NextResponse.json({ workspace }, { status: 201 })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 })
  }
}

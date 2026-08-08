import { NextResponse } from "next/server"

import { requireSession } from "@/server/auth/session"
import {
  createFileSource,
  listSources,
} from "@/server/sources/service"
import { createFileSourceInputSchema } from "@/server/sources/validations"

type RouteContext = {
  params: Promise<{ workspaceId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession()
    const { workspaceId } = await context.params
    const sources = await listSources(session.user.id, workspaceId)
    return NextResponse.json({ sources })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json({ error: "Failed to list sources" }, { status: 500 })
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSession()
    const { workspaceId } = await context.params
    const body = await request.json()
    const parsed = createFileSourceInputSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const source = await createFileSource(
      session.user.id,
      workspaceId,
      parsed.data
    )
    return NextResponse.json({ source }, { status: 201 })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json({ error: "Failed to create source" }, { status: 500 })
  }
}

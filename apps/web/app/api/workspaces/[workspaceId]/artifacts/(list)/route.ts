import { NextResponse } from "next/server"

import {
  createArtifact,
  createArtifactInputSchema,
  listArtifacts,
} from "@/server/artifacts"
import { requireSession } from "@/server/auth/session"

type RouteContext = {
  params: Promise<{ workspaceId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession()
    const { workspaceId } = await context.params
    const artifacts = await listArtifacts(session.user.id, workspaceId)
    return NextResponse.json({ artifacts })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json(
      { error: "Failed to list artifacts" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSession()
    const { workspaceId } = await context.params
    const body = await request.json()
    const parsed = createArtifactInputSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const artifact = await createArtifact(
      session.user.id,
      workspaceId,
      parsed.data
    )
    return NextResponse.json({ artifact }, { status: 201 })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json(
      { error: "Failed to create artifact" },
      { status: 500 }
    )
  }
}

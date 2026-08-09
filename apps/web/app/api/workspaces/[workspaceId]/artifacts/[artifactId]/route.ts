import { NextResponse } from "next/server"

import {
  deleteArtifact,
  getArtifact,
  regenerateArtifact,
} from "@/server/artifacts"
import { requireSession } from "@/server/auth/session"

type RouteContext = {
  params: Promise<{ workspaceId: string; artifactId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession()
    const { workspaceId, artifactId } = await context.params
    const artifact = await getArtifact(
      session.user.id,
      workspaceId,
      artifactId
    )

    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 })
    }

    return NextResponse.json({ artifact })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json(
      { error: "Failed to get artifact" },
      { status: 500 }
    )
  }
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession()
    const { workspaceId, artifactId } = await context.params
    const artifact = await regenerateArtifact(
      session.user.id,
      workspaceId,
      artifactId
    )

    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 })
    }

    return NextResponse.json({ artifact })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json(
      { error: "Failed to regenerate artifact" },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession()
    const { workspaceId, artifactId } = await context.params
    const deleted = await deleteArtifact(
      session.user.id,
      workspaceId,
      artifactId
    )

    if (!deleted) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json(
      { error: "Failed to delete artifact" },
      { status: 500 }
    )
  }
}

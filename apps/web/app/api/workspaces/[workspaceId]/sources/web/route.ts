import { NextResponse } from "next/server"

import { requireSession } from "@/server/auth/session"
import { createWebSource } from "@/server/sources/service"
import { createWebSourceInputSchema } from "@/server/sources/validations"

type RouteContext = {
  params: Promise<{ workspaceId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSession()
    const { workspaceId } = await context.params
    const body = await request.json()
    const parsed = createWebSourceInputSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const source = await createWebSource(
      session.user.id,
      workspaceId,
      parsed.data
    )
    return NextResponse.json({ source }, { status: 201 })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json(
      { error: "Failed to create web source" },
      { status: 500 }
    )
  }
}

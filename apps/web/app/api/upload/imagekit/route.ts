import { getUploadAuthParams } from "@imagekit/next/server"
import { NextResponse } from "next/server"

import { requireSession } from "@/server/auth/session"
import { env } from "@/server/env"

export async function GET() {
  try {
    await requireSession()

    const { token, expire, signature } = getUploadAuthParams({
      privateKey: env.imagekitPrivateKey,
      publicKey: env.imagekitPublicKey,
    })

    return NextResponse.json({
      token,
      expire,
      signature,
      publicKey: env.imagekitPublicKey,
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    return NextResponse.json(
      { error: "Failed to create upload auth" },
      { status: 500 }
    )
  }
}

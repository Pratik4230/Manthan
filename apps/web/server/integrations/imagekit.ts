import ImageKit from "imagekit"

import { env } from "@/server/env"

let client: ImageKit | null = null

function getImageKit() {
  if (!client) {
    client = new ImageKit({
      publicKey: env.imagekitPublicKey,
      privateKey: env.imagekitPrivateKey,
      urlEndpoint: env.imagekitUrlEndpoint,
    })
  }
  return client
}

export async function deleteImageKitFile(fileId: string) {
  await getImageKit().deleteFile(fileId)
}

export async function downloadImageKitFile(url: string): Promise<Uint8Array> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `Failed to download file from ImageKit (${response.status})`
    )
  }

  const buffer = await response.arrayBuffer()
  if (buffer.byteLength === 0) {
    throw new Error("Downloaded file is empty")
  }

  return new Uint8Array(buffer)
}


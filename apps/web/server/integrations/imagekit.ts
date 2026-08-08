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

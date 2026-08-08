import type { SourceDto } from "@/server/sources/service"

async function parseJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    throw new Error(
      response.ok
        ? "Unexpected non-JSON response"
        : `Request failed (${response.status})`
    )
  }
  const data = (await response.json()) as T & { error?: string }
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed")
  }
  return data
}

export async function fetchUploadAuth() {
  return parseJson<{
    token: string
    expire: number
    signature: string
    publicKey: string
  }>(await fetch("/api/upload/imagekit"))
}

export async function fetchSources(workspaceId: string): Promise<SourceDto[]> {
  const data = await parseJson<{ sources: SourceDto[] }>(
    await fetch(`/api/workspaces/${workspaceId}/sources`)
  )
  return data.sources
}

export async function createFileSourceRequest(
  workspaceId: string,
  input: {
    title: string
    fileName: string
    fileSize: number
    mimeType: string
    imageKitFileId: string
    imageKitUrl: string
    extension: string
  }
): Promise<SourceDto> {
  const data = await parseJson<{ source: SourceDto }>(
    await fetch(`/api/workspaces/${workspaceId}/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  )
  return data.source
}

export async function createWebSourceRequest(
  workspaceId: string,
  input: { url: string; title?: string }
): Promise<SourceDto> {
  const data = await parseJson<{ source: SourceDto }>(
    await fetch(`/api/workspaces/${workspaceId}/sources/web`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  )
  return data.source
}

export async function createYoutubeSourceRequest(
  workspaceId: string,
  input: { url: string; title?: string }
): Promise<SourceDto> {
  const data = await parseJson<{ source: SourceDto }>(
    await fetch(`/api/workspaces/${workspaceId}/sources/youtube`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  )
  return data.source
}

export async function deleteSourceRequest(
  workspaceId: string,
  sourceId: string
): Promise<void> {
  await parseJson<{ ok: boolean }>(
    await fetch(`/api/workspaces/${workspaceId}/sources/${sourceId}`, {
      method: "DELETE",
    })
  )
}

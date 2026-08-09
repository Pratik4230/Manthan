import type { ArtifactDto } from "@/server/artifacts"
import type { ArtifactType } from "@/server/models/artifact"

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

export async function fetchArtifacts(
  workspaceId: string
): Promise<ArtifactDto[]> {
  const data = await parseJson<{ artifacts: ArtifactDto[] }>(
    await fetch(`/api/workspaces/${workspaceId}/artifacts`)
  )
  return data.artifacts
}

export async function createArtifactRequest(
  workspaceId: string,
  type: ArtifactType
): Promise<ArtifactDto> {
  const data = await parseJson<{ artifact: ArtifactDto }>(
    await fetch(`/api/workspaces/${workspaceId}/artifacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    })
  )
  return data.artifact
}

export async function regenerateArtifactRequest(
  workspaceId: string,
  artifactId: string
): Promise<ArtifactDto> {
  const data = await parseJson<{ artifact: ArtifactDto }>(
    await fetch(`/api/workspaces/${workspaceId}/artifacts/${artifactId}`, {
      method: "POST",
    })
  )
  return data.artifact
}

export async function deleteArtifactRequest(
  workspaceId: string,
  artifactId: string
): Promise<void> {
  await parseJson<{ ok: boolean }>(
    await fetch(`/api/workspaces/${workspaceId}/artifacts/${artifactId}`, {
      method: "DELETE",
    })
  )
}

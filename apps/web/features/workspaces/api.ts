import type { WorkspaceDto } from "@/server/workspaces/service"

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

export async function fetchWorkspaces(): Promise<WorkspaceDto[]> {
  const data = await parseJson<{ workspaces: WorkspaceDto[] }>(
    await fetch("/api/workspaces")
  )
  return data.workspaces
}

export async function fetchWorkspace(workspaceId: string): Promise<WorkspaceDto> {
  const data = await parseJson<{ workspace: WorkspaceDto }>(
    await fetch(`/api/workspaces/${workspaceId}`)
  )
  return data.workspace
}

export async function createWorkspaceRequest(input: {
  title: string
  instructions?: string
}): Promise<WorkspaceDto> {
  const data = await parseJson<{ workspace: WorkspaceDto }>(
    await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  )
  return data.workspace
}

export async function updateWorkspaceRequest(
  workspaceId: string,
  input: { title?: string; instructions?: string }
): Promise<WorkspaceDto> {
  const data = await parseJson<{ workspace: WorkspaceDto }>(
    await fetch(`/api/workspaces/${workspaceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  )
  return data.workspace
}

export async function deleteWorkspaceRequest(workspaceId: string): Promise<void> {
  await parseJson<{ ok: boolean }>(
    await fetch(`/api/workspaces/${workspaceId}`, {
      method: "DELETE",
    })
  )
}

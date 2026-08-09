"use client"

import { ChatPane } from "@/features/chat"
import { NotebookShell } from "@/features/notebook"
import { SourcesPane } from "@/features/sources"
import { StudioPane } from "@/features/studio"
import { useWorkspace } from "@/features/workspaces/hooks"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"

export function WorkspaceNotebook({ workspaceId }: { workspaceId: string }) {
  const { data, isLoading, isError, error, refetch } = useWorkspace(workspaceId)

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[70svh] w-full" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="space-y-3 p-6">
        <h1 className="text-xl font-semibold">Workspace unavailable</h1>
        <p className="text-muted-foreground">
          {error instanceof Error ? error.message : "Workspace not found"}
        </p>
        <Button variant="outline" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <NotebookShell
      workspaceId={data.id}
      title={data.title}
      sources={<SourcesPane workspaceId={data.id} />}
      chat={<ChatPane workspaceId={data.id} />}
      studio={<StudioPane workspaceId={data.id} />}
    />
  )
}

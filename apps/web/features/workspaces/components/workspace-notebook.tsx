"use client"

import { NotebookShell } from "@/features/notebook"
import { SourcesPane } from "@/features/sources"
import { useWorkspace } from "@/features/workspaces/hooks"
import { Skeleton } from "@workspace/ui/components/skeleton"

export function WorkspaceNotebook({ workspaceId }: { workspaceId: string }) {
  const { data, isLoading, isError, error } = useWorkspace(workspaceId)

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
      <div className="p-6">
        <h1 className="text-xl font-semibold">Workspace unavailable</h1>
        <p className="text-muted-foreground">
          {error instanceof Error ? error.message : "Workspace not found"}
        </p>
      </div>
    )
  }

  return (
    <NotebookShell
      workspaceId={data.id}
      title={data.title}
      sources={<SourcesPane workspaceId={data.id} />}
      chat={
        <p className="text-sm text-muted-foreground">
          Chat grounded in your sources will live here.
        </p>
      }
      studio={
        <p className="text-sm text-muted-foreground">
          Study guides, quizzes, and other outputs will appear here later.
        </p>
      }
    />
  )
}

"use client"

import Link from "next/link"
import { toast } from "sonner"

import { CreateWorkspaceDialog } from "@/features/workspaces/components/create-workspace-dialog"
import {
  useDeleteWorkspace,
  useWorkspaces,
} from "@/features/workspaces/hooks"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

export function WorkspaceList() {
  const { data, isLoading, isError, error, refetch } = useWorkspaces()
  const deleteWorkspace = useDeleteWorkspace()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground">
            Create a workspace, add sources, then chat with them.
          </p>
        </div>
        <CreateWorkspaceDialog />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {isError ? (
        <Card>
          <CardHeader>
            <CardTitle>Couldn’t load workspaces</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "Something went wrong"}
            </CardDescription>
            <Button variant="outline" onClick={() => void refetch()}>
              Retry
            </Button>
          </CardHeader>
        </Card>
      ) : null}

      {!isLoading && !isError && data?.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No workspaces yet</CardTitle>
            <CardDescription>
              Create your first workspace to start adding sources.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {data?.map((workspace) => (
          <Card key={workspace.id} className="transition-colors hover:bg-muted/40">
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <Link
                href={`/workspaces/${workspace.id}`}
                className="min-w-0 flex-1 space-y-1"
              >
                <CardTitle className="truncate">{workspace.title}</CardTitle>
                <CardDescription>
                  Updated {new Date(workspace.updatedAt).toLocaleString()}
                </CardDescription>
                {workspace.instructions ? (
                  <Badge variant="secondary">Custom instructions</Badge>
                ) : null}
              </Link>
              <Button
                variant="ghost"
                size="sm"
                disabled={deleteWorkspace.isPending}
                onClick={() => {
                  void deleteWorkspace
                    .mutateAsync(workspace.id)
                    .then(() => toast.success("Workspace deleted"))
                    .catch((err: unknown) =>
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : "Failed to delete workspace"
                      )
                    )
                }}
              >
                Delete
              </Button>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}

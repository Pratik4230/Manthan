"use client"

import { useEffect } from "react"

import { useSources } from "@/features/sources/hooks"
import { useWorkspace } from "@/features/workspaces/hooks"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"

export function StudioPane({ workspaceId }: { workspaceId: string }) {
  const {
    data: workspace,
    isLoading: workspaceLoading,
    isError: workspaceError,
    error: workspaceErrorValue,
    refetch: refetchWorkspace,
  } = useWorkspace(workspaceId)
  const sourcesQuery = useSources(workspaceId)

  const sourcesFingerprint =
    sourcesQuery.data
      ?.map(
        (source) =>
          `${source.id}:${source.status}:${source.summary ?? ""}`
      )
      .join("|") ?? ""

  useEffect(() => {
    void refetchWorkspace()
  }, [sourcesFingerprint, refetchWorkspace])

  if (workspaceLoading || sourcesQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (workspaceError) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">
          {workspaceErrorValue instanceof Error
            ? workspaceErrorValue.message
            : "Failed to load studio"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetchWorkspace()}
        >
          Retry
        </Button>
      </div>
    )
  }

  const readySources =
    sourcesQuery.data?.filter((source) => source.status === "ready") ?? []
  const summary = workspace?.summary

  if (readySources.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">Studio</p>
        <p className="text-sm text-muted-foreground">
          Add and finish ingesting sources to see a notebook overview here.
          Guides, quizzes, and other artifacts come in a later phase.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Notebook overview</p>
        {summary ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {summary}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Overview will appear after source summaries finish generating. Use
            Re-index on a source if it stays empty.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Source summaries
        </p>
        <ul className="space-y-2">
          {readySources.map((source) => (
            <li key={source.id} className="rounded-lg border p-2.5">
              <p className="text-xs font-medium">{source.title}</p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">
                {source.summary || "No summary yet."}
              </p>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">
        Briefings, FAQs, flashcards, and quizzes land in Phase 2.
      </p>
    </div>
  )
}

"use client"

import {
  AssistantRuntimeProvider,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react"
import { useDataStreamRuntime } from "@assistant-ui/react-data-stream"
import { useMemo } from "react"

import { Thread } from "@/components/assistant-ui/thread"
import { ThreadList } from "@/components/assistant-ui/thread-list"
import { CitationsDataUI } from "@/features/chat/components/citation-chips"
import { createWorkspaceThreadListAdapter } from "@/features/chat/thread-list-adapter"
import { useSources } from "@/features/sources/hooks"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"

function useWorkspaceDataStreamRuntime(workspaceId: string) {
  return useDataStreamRuntime({
    api: `/api/chat/${workspaceId}`,
    credentials: "include",
  })
}

function NoReadySourcesEmpty() {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-base font-medium">No ready sources yet</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Add a file, web page, or YouTube link in the Sources panel and wait until
        it shows Ready. Chat only uses enabled ready sources.
      </p>
    </div>
  )
}

export function ChatPane({ workspaceId }: { workspaceId: string }) {
  const sourcesQuery = useSources(workspaceId)
  const readyCount =
    sourcesQuery.data?.filter(
      (source) => source.status === "ready" && source.enabled
    ).length ?? 0

  const adapter = useMemo(
    () => createWorkspaceThreadListAdapter(workspaceId),
    [workspaceId]
  )

  const useThreadRuntime = useMemo(() => {
    function useThreadRuntime() {
      return useWorkspaceDataStreamRuntime(workspaceId)
    }
    return useThreadRuntime
  }, [workspaceId])

  const runtime = useRemoteThreadListRuntime({
    adapter,
    runtimeHook: useThreadRuntime,
  })

  const showChat = !sourcesQuery.isLoading && readyCount > 0

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <CitationsDataUI />
      <div className="flex h-full min-h-0">
        <aside className="flex w-56 shrink-0 flex-col border-r bg-muted/20 p-2">
          <p className="mb-1 px-2.5 text-xs font-medium text-muted-foreground">
            Conversations
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {showChat ? (
              <ThreadList />
            ) : (
              <p className="px-2.5 text-xs text-muted-foreground">
                Conversations unlock once a source is ready.
              </p>
            )}
          </div>
        </aside>
        <div className="min-h-0 min-w-0 flex-1">
          {sourcesQuery.isLoading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-24 w-full max-w-md" />
              <p className="text-sm text-muted-foreground">Loading sources…</p>
            </div>
          ) : sourcesQuery.isError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-base font-medium">Could not load sources</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {sourcesQuery.error instanceof Error
                  ? sourcesQuery.error.message
                  : "Something went wrong"}
              </p>
              <Button
                variant="outline"
                onClick={() => void sourcesQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : showChat ? (
            <Thread />
          ) : (
            <NoReadySourcesEmpty />
          )}
        </div>
      </div>
    </AssistantRuntimeProvider>
  )
}

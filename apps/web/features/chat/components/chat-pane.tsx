"use client"

import {
  AssistantRuntimeProvider,
  useAui,
  useAuiState,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react"
import { useDataStreamRuntime } from "@assistant-ui/react-data-stream"
import { useMemo } from "react"

import { Thread } from "@/components/assistant-ui/thread"
import { createWorkspaceThreadListAdapter } from "@/features/chat/thread-list-adapter"
import { Button } from "@workspace/ui/components/button"

function ChatToolbar() {
  const aui = useAui()
  const title = useAuiState((state) => state.threadListItem.title)

  return (
    <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
      <p className="truncate text-sm text-muted-foreground">
        {title?.trim() || "New chat"}
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          void aui.threads.switchToNewThread()
        }}
      >
        New chat
      </Button>
    </div>
  )
}

function useWorkspaceDataStreamRuntime(workspaceId: string) {
  return useDataStreamRuntime({
    api: `/api/chat/${workspaceId}`,
    credentials: "include",
  })
}

export function ChatPane({ workspaceId }: { workspaceId: string }) {
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

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-full min-h-0 flex-col">
        <ChatToolbar />
        <div className="min-h-0 flex-1">
          <Thread />
        </div>
      </div>
    </AssistantRuntimeProvider>
  )
}

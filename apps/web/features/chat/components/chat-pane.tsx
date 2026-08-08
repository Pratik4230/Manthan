"use client"

import { AssistantRuntimeProvider } from "@assistant-ui/react"
import { useDataStreamRuntime } from "@assistant-ui/react-data-stream"

import { Thread } from "@/components/assistant-ui/thread"

export function ChatPane({ workspaceId }: { workspaceId: string }) {
  const runtime = useDataStreamRuntime({
    api: `/api/chat/${workspaceId}`,
    credentials: "include",
  })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-full min-h-0 flex-col">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  )
}

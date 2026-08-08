"use client"

import {
  RuntimeAdapterProvider,
  useAui,
  type RemoteThreadListAdapter,
  type ThreadHistoryAdapter,
  type ThreadMessage,
} from "@assistant-ui/react"
import { createAssistantStream } from "assistant-stream"
import { useMemo, type ReactNode } from "react"

type ThreadRow = {
  id: string
  title: string | null
  status: "regular" | "archived"
}

type MessageRow = {
  id: string
  parentId: string | null
  message: ThreadMessage
}

function messageText(message: ThreadMessage): string {
  if (typeof message.content === "string") {
    return message.content
  }
  if (!Array.isArray(message.content)) {
    return ""
  }
  return message.content
    .map((part) => {
      if (part.type === "text") {
        return part.text
      }
      return ""
    })
    .join("")
    .trim()
}

function deriveTitle(messages: readonly ThreadMessage[]): string {
  const firstUser = messages.find((message) => message.role === "user")
  if (!firstUser) {
    return "New chat"
  }
  const text = messageText(firstUser)
  if (!text) {
    return "New chat"
  }
  return text.length > 60 ? `${text.slice(0, 57)}...` : text
}

export function createWorkspaceThreadListAdapter(
  workspaceId: string
): RemoteThreadListAdapter {
  const base = `/api/workspaces/${workspaceId}/threads`

  return {
    async list() {
      const response = await fetch(base, { credentials: "include" })
      if (!response.ok) {
        throw new Error("Failed to list threads")
      }
      const data = (await response.json()) as { threads: ThreadRow[] }
      return {
        threads: data.threads.map((thread) => ({
          status: thread.status,
          remoteId: thread.id,
          title: thread.title ?? undefined,
        })),
      }
    },
    async initialize() {
      const response = await fetch(base, {
        method: "POST",
        credentials: "include",
      })
      if (!response.ok) {
        throw new Error("Failed to create thread")
      }
      const data = (await response.json()) as { thread: ThreadRow }
      return { remoteId: data.thread.id }
    },
    async rename(remoteId, title) {
      const response = await fetch(`${base}/${remoteId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      if (!response.ok) {
        throw new Error("Failed to rename thread")
      }
    },
    async archive(remoteId) {
      const response = await fetch(`${base}/${remoteId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      })
      if (!response.ok) {
        throw new Error("Failed to archive thread")
      }
    },
    async unarchive(remoteId) {
      const response = await fetch(`${base}/${remoteId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "regular" }),
      })
      if (!response.ok) {
        throw new Error("Failed to unarchive thread")
      }
    },
    async delete(remoteId) {
      const response = await fetch(`${base}/${remoteId}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!response.ok) {
        throw new Error("Failed to delete thread")
      }
    },
    async fetch(remoteId) {
      const response = await fetch(`${base}/${remoteId}`, {
        credentials: "include",
      })
      if (!response.ok) {
        throw new Error("Failed to fetch thread")
      }
      const data = (await response.json()) as { thread: ThreadRow }
      return {
        status: data.thread.status,
        remoteId: data.thread.id,
        title: data.thread.title ?? undefined,
      }
    },
    async generateTitle(remoteId, messages) {
      const title = deriveTitle(messages)
      await fetch(`${base}/${remoteId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      return createAssistantStream((controller) => {
        controller.appendText(title)
      })
    },
    unstable_Provider({ children }: { children?: ReactNode }) {
      return (
        <ThreadHistoryProvider workspaceId={workspaceId}>
          {children}
        </ThreadHistoryProvider>
      )
    },
  }
}

function ThreadHistoryProvider({
  workspaceId,
  children,
}: {
  workspaceId: string
  children?: ReactNode
}) {
  const aui = useAui()
  const history = useMemo<ThreadHistoryAdapter>(
    () => ({
      async load() {
        const { remoteId } = aui.threadListItem.getState()
        if (!remoteId) {
          return { messages: [] }
        }
        const response = await fetch(
          `/api/workspaces/${workspaceId}/threads/${remoteId}/messages`,
          { credentials: "include" }
        )
        if (!response.ok) {
          throw new Error("Failed to load messages")
        }
        const data = (await response.json()) as { messages: MessageRow[] }
        return {
          messages: data.messages.map((row) => ({
            parentId: row.parentId,
            message: row.message,
          })),
        }
      },
      async append({ message, parentId }) {
        const { remoteId } = await aui.threadListItem.initialize()
        const response = await fetch(
          `/api/workspaces/${workspaceId}/threads/${remoteId}/messages`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messageId: message.id,
              parentId,
              message,
            }),
          }
        )
        if (!response.ok) {
          throw new Error("Failed to append message")
        }
      },
    }),
    [aui, workspaceId]
  )

  return (
    <RuntimeAdapterProvider adapters={{ history }}>
      {children}
    </RuntimeAdapterProvider>
  )
}

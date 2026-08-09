"use client"

import { useEffect, useState } from "react"

export function usePersistedState<T>(key: string, defaultValue: T) {
  const [state, setState] = useState<T>(defaultValue)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw !== null) {
        setState(JSON.parse(raw) as T)
      }
    } catch {
      // ignore invalid storage
    }
    setHydrated(true)
  }, [key])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // ignore quota / private mode
    }
  }, [key, state, hydrated])

  return [state, setState] as const
}

export function notebookPaneKey(workspaceId: string, pane: "sources" | "studio") {
  return `manthan:workspace:${workspaceId}:pane:${pane}-collapsed`
}

export function chatSidebarKey(workspaceId: string) {
  return `manthan:workspace:${workspaceId}:chat-sidebar-collapsed`
}

"use client"

import Link from "next/link"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PanelLeftCloseIcon,
  PanelRightCloseIcon,
} from "lucide-react"

import { usePersistedState, notebookPaneKey } from "@/hooks/use-persisted-state"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type CollapsiblePaneKey = "sources" | "studio"

type NotebookShellProps = {
  workspaceId: string
  title: string
  sources: React.ReactNode
  chat: React.ReactNode
  studio: React.ReactNode
}

type NotebookPaneProps = {
  paneKey: CollapsiblePaneKey
  title: string
  collapsed: boolean
  onToggle: () => void
  children: React.ReactNode
  flexClass: string
  borderClass: string
}

function NotebookPane({
  paneKey,
  title,
  collapsed,
  onToggle,
  children,
  flexClass,
  borderClass,
}: NotebookPaneProps) {
  const expandIcon =
    paneKey === "sources" ? (
      <ChevronRightIcon className="size-4" />
    ) : (
      <ChevronLeftIcon className="size-4" />
    )

  const collapseIcon =
    paneKey === "sources" ? (
      <PanelLeftCloseIcon className="size-4" />
    ) : (
      <PanelRightCloseIcon className="size-4" />
    )

  if (collapsed) {
    return (
      <section
        className={cn(
          "flex min-h-0 shrink-0 flex-col",
          borderClass,
          "w-full lg:w-9"
        )}
      >
        <div className="flex items-center justify-between gap-1 border-b px-2 py-2 lg:flex-col lg:justify-start lg:gap-2 lg:px-0 lg:py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={onToggle}
            aria-label={`Expand ${title}`}
            title={`Expand ${title}`}
          >
            {expandIcon}
          </Button>
          <span className="truncate text-sm font-medium lg:hidden">{title}</span>
          <span
            className="hidden text-[10px] font-medium tracking-wide text-muted-foreground uppercase lg:block"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            {title}
          </span>
        </div>
      </section>
    )
  }

  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-col",
        borderClass,
        flexClass
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <h2 className="truncate text-sm font-medium">{title}</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          aria-label={`Collapse ${title}`}
          title={`Collapse ${title}`}
        >
          {collapseIcon}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2 lg:p-3">{children}</div>
    </section>
  )
}

export function NotebookShell({
  workspaceId,
  title,
  sources,
  chat,
  studio,
}: NotebookShellProps) {
  const [sourcesCollapsed, setSourcesCollapsed] = usePersistedState(
    notebookPaneKey(workspaceId, "sources"),
    false
  )
  const [studioCollapsed, setStudioCollapsed] = usePersistedState(
    notebookPaneKey(workspaceId, "studio"),
    false
  )

  return (
    <div className="flex h-[calc(100svh-3rem)] min-h-0 flex-col lg:flex-row">
      <NotebookPane
        paneKey="sources"
        title="Sources"
        collapsed={sourcesCollapsed}
        onToggle={() => setSourcesCollapsed((prev) => !prev)}
        flexClass="w-full lg:flex-[1.5]"
        borderClass="border-b lg:border-r lg:border-b-0"
      >
        {sources}
      </NotebookPane>
      <section className="flex min-h-0 w-full min-w-0 flex-col border-b lg:flex-6 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              Conversation
            </p>
            <h2 className="truncate text-sm font-medium">{title}</h2>
          </div>
          <Link
            href="/workspaces"
            className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
          >
            Workspaces
          </Link>
        </div>
        <div className="flex h-full min-h-[50vh] flex-1 flex-col overflow-hidden lg:min-h-0">
          {chat}
        </div>
      </section>
      <NotebookPane
        paneKey="studio"
        title="Studio"
        collapsed={studioCollapsed}
        onToggle={() => setStudioCollapsed((prev) => !prev)}
        flexClass="w-full lg:flex-[2.5]"
        borderClass=""
      >
        {studio}
      </NotebookPane>
    </div>
  )
}

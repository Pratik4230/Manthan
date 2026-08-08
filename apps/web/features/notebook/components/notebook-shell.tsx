import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

type NotebookShellProps = {
  workspaceId: string
  title: string
  sources: React.ReactNode
  chat: React.ReactNode
  studio: React.ReactNode
}

export function NotebookShell({
  workspaceId,
  title,
  sources,
  chat,
  studio,
}: NotebookShellProps) {
  return (
    <div className="flex h-[calc(100svh-4.25rem)] flex-col">
      <div className="flex items-center justify-between gap-4 border-b px-4 py-3">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="mb-1 px-0">
            <Link href="/workspaces">All workspaces</Link>
          </Button>
          <h1 className="truncate text-lg font-semibold tracking-tight">
            {title}
          </h1>
        </div>
        <p className="hidden text-xs text-muted-foreground sm:block">
          {workspaceId.slice(0, 8)}
        </p>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-12">
        <section className="min-h-0 border-b lg:col-span-3 lg:border-r lg:border-b-0">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-medium">Sources</h2>
          </div>
          <div className="h-full overflow-y-auto p-4">{sources}</div>
        </section>
        <section className="min-h-0 border-b lg:col-span-6 lg:border-r lg:border-b-0">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-medium">Chat</h2>
          </div>
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            {chat}
          </div>
        </section>
        <section className="min-h-0 lg:col-span-3">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-medium">Studio</h2>
          </div>
          <div className="h-full overflow-y-auto p-4">{studio}</div>
        </section>
      </div>
    </div>
  )
}

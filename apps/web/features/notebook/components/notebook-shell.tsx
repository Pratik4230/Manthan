import Link from "next/link"

type NotebookShellProps = {
  title: string
  sources: React.ReactNode
  chat: React.ReactNode
  studio: React.ReactNode
}

export function NotebookShell({
  title,
  sources,
  chat,
  studio,
}: NotebookShellProps) {
  return (
    <div className="flex h-[calc(100svh-3rem)] min-h-0 flex-col lg:flex-row">
      <section className="flex min-h-0 w-full shrink-0 flex-col border-b lg:w-44 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <h2 className="text-sm font-medium">Sources</h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">{sources}</div>
      </section>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col border-b lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <h2 className="truncate text-sm font-medium">{title}</h2>
          <Link
            href="/workspaces"
            className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
          >
            Workspaces
          </Link>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {chat}
        </div>
      </section>
      <section className="flex min-h-0 w-full shrink-0 flex-col lg:w-72">
        <div className="border-b px-3 py-2">
          <h2 className="text-sm font-medium">Studio</h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">{studio}</div>
      </section>
    </div>
  )
}

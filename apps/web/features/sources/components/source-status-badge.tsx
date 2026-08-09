import { cn } from "@workspace/ui/lib/utils"

export type SourceStatusBadgeSource = {
  status: string
  ingestStage:
    | "queued"
    | "downloading"
    | "parsing"
    | "chunking"
    | "embedding"
    | "summarizing"
    | "indexing"
    | null
}

function statusLabel(source: SourceStatusBadgeSource): string {
  if (source.status === "ready") return "Ready"
  if (source.status === "failed") return "Failed"
  if (source.ingestStage === "queued") return "Queued"
  if (source.ingestStage === "downloading") return "Downloading"
  if (source.ingestStage === "parsing") return "Parsing"
  if (source.ingestStage === "chunking") return "Chunking"
  if (source.ingestStage === "embedding") return "Embedding"
  if (source.ingestStage === "summarizing") return "Summarizing"
  if (source.ingestStage === "indexing") return "Indexing"
  if (source.status === "pending") return "Queued"
  if (source.status === "processing") return "Processing"
  return source.status
}

type StatusPresentation = {
  label: string
  className: string
  active: boolean
}

function statusPresentation(source: SourceStatusBadgeSource): StatusPresentation {
  const label = statusLabel(source)

  if (source.status === "ready") {
    return {
      label,
      active: false,
      className:
        "border-emerald-500/60 bg-emerald-500/15 text-emerald-800 shadow-[0_0_12px_-2px] shadow-emerald-500/40 dark:text-emerald-300",
    }
  }

  if (source.status === "failed") {
    return {
      label,
      active: false,
      className:
        "border-destructive/70 bg-destructive/15 text-destructive shadow-[0_0_12px_-2px] shadow-destructive/35",
    }
  }

  if (source.ingestStage === "queued" || source.status === "pending") {
    return {
      label,
      active: true,
      className:
        "border-amber-500/55 bg-amber-500/12 text-amber-900 shadow-[0_0_14px_-2px] shadow-amber-500/35 dark:text-amber-200",
    }
  }

  if (source.ingestStage === "downloading") {
    return {
      label,
      active: true,
      className:
        "border-sky-500/60 bg-sky-500/15 text-sky-900 shadow-[0_0_14px_-2px] shadow-sky-500/40 dark:text-sky-200",
    }
  }

  if (source.ingestStage === "parsing") {
    return {
      label,
      active: true,
      className:
        "border-violet-500/60 bg-violet-500/15 text-violet-900 shadow-[0_0_14px_-2px] shadow-violet-500/40 dark:text-violet-200",
    }
  }

  if (source.ingestStage === "chunking") {
    return {
      label,
      active: true,
      className:
        "border-cyan-500/60 bg-cyan-500/15 text-cyan-900 shadow-[0_0_14px_-2px] shadow-cyan-500/40 dark:text-cyan-200",
    }
  }

  if (source.ingestStage === "embedding") {
    return {
      label,
      active: true,
      className:
        "border-indigo-500/65 bg-indigo-500/18 text-indigo-900 shadow-[0_0_16px_-1px] shadow-indigo-500/50 ring-1 ring-indigo-400/30 dark:text-indigo-200",
    }
  }

  if (source.ingestStage === "summarizing") {
    return {
      label,
      active: true,
      className:
        "border-orange-500/60 bg-orange-500/15 text-orange-900 shadow-[0_0_14px_-2px] shadow-orange-500/40 dark:text-orange-200",
    }
  }

  if (source.ingestStage === "indexing") {
    return {
      label,
      active: true,
      className:
        "border-yellow-400/70 bg-yellow-400/20 text-yellow-950 shadow-[0_0_14px_-2px] shadow-yellow-400/45 dark:text-yellow-100",
    }
  }

  return {
    label,
    active: source.status === "processing",
    className:
      "border-primary/50 bg-primary/10 text-primary shadow-[0_0_12px_-2px] shadow-primary/30",
  }
}

export function SourceStatusBadge({ source }: { source: SourceStatusBadgeSource }) {
  const { label, className, active } = statusPresentation(source)

  return (
    <span
      className={cn(
        "relative flex w-full min-h-7 items-center justify-center gap-2 overflow-hidden rounded-md border-2 px-3 py-1 text-xs font-semibold tracking-wide",
        className,
        active && "animate-pulse motion-reduce:animate-none"
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full bg-current opacity-90 animate-ping motion-reduce:animate-none"
        />
      ) : null}
      <span className="relative z-1">{label}</span>
      {active ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 shimmer opacity-40 motion-reduce:hidden"
        />
      ) : null}
    </span>
  )
}

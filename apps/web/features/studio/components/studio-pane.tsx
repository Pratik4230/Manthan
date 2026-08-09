"use client"

import { useEffect, useState } from "react"
import { Maximize2Icon } from "lucide-react"
import { toast } from "sonner"

import { useSources } from "@/features/sources/hooks"
import { artifactContentToMarkdown } from "@/features/studio/format"
import {
  useArtifacts,
  useCreateArtifact,
  useDeleteArtifact,
  useRegenerateArtifact,
} from "@/features/studio/hooks"
import { useWorkspace } from "@/features/workspaces/hooks"
import {
  ARTIFACT_TYPE_LABELS,
  ARTIFACT_TYPES,
  type ArtifactType,
} from "@/server/models/artifact"
import type { ArtifactDto } from "@/server/artifacts"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Skeleton } from "@workspace/ui/components/skeleton"

function statusLabel(status: string) {
  if (status === "pending") return "Queued"
  if (status === "processing") return "Generating"
  if (status === "ready") return "Ready"
  if (status === "failed") return "Failed"
  return status
}

function statusVariant(
  status: string
): "secondary" | "default" | "outline" | "destructive" {
  if (status === "ready") return "default"
  if (status === "failed") return "destructive"
  if (status === "processing") return "secondary"
  return "outline"
}

function ArtifactBody({
  artifact,
  expanded = false,
}: {
  artifact: ArtifactDto
  expanded?: boolean
}) {
  if (artifact.status === "pending" || artifact.status === "processing") {
    return (
      <p className="text-sm text-muted-foreground">
        Generating from your ready sources…
      </p>
    )
  }

  if (artifact.status === "failed") {
    return (
      <p className="text-sm text-destructive">
        {artifact.error || "Generation failed"}
      </p>
    )
  }

  const markdown = artifactContentToMarkdown(artifact.type, artifact.content)
  return (
    <pre
      className={
        expanded
          ? "whitespace-pre-wrap text-sm leading-relaxed"
          : "max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed"
      }
    >
      {markdown || "No content"}
    </pre>
  )
}

type ArtifactActionsProps = {
  artifact: ArtifactDto
  readyCount: number
  regeneratePending: boolean
  deletePending: boolean
  onRegenerate: () => void
  onDelete: () => void
}

function ArtifactActions({
  artifact,
  readyCount,
  regeneratePending,
  deletePending,
  onRegenerate,
  onDelete,
}: ArtifactActionsProps) {
  const canCopy =
    artifact.status === "ready" &&
    artifact.content &&
    typeof navigator !== "undefined"

  return (
    <div className="flex flex-wrap gap-1.5">
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        disabled={!canCopy}
        onClick={() => {
          const markdown = artifactContentToMarkdown(
            artifact.type,
            artifact.content
          )
          void navigator.clipboard
            .writeText(markdown)
            .then(() => toast.success("Copied"))
            .catch(() => toast.error("Copy failed"))
        }}
      >
        Copy
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        disabled={
          regeneratePending ||
          artifact.status === "pending" ||
          artifact.status === "processing" ||
          readyCount === 0
        }
        onClick={onRegenerate}
      >
        Regenerate
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs"
        disabled={deletePending}
        onClick={onDelete}
      >
        Delete
      </Button>
    </div>
  )
}

function ArtifactExpandDialog({
  artifact,
  open,
  onOpenChange,
  readyCount,
  regeneratePending,
  deletePending,
  onRegenerate,
  onDelete,
}: {
  artifact: ArtifactDto
  open: boolean
  onOpenChange: (open: boolean) => void
  readyCount: number
  regeneratePending: boolean
  deletePending: boolean
  onRegenerate: () => void
  onDelete: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92vh,960px)] w-[calc(100%-2rem)] max-w-5xl flex-col gap-4 overflow-hidden p-6 sm:max-w-5xl">
        <DialogHeader className="shrink-0 gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <DialogTitle>{ARTIFACT_TYPE_LABELS[artifact.type]}</DialogTitle>
            <Badge variant={statusVariant(artifact.status)}>
              {statusLabel(artifact.status)}
            </Badge>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-muted/20 p-4">
          <ArtifactBody artifact={artifact} expanded />
        </div>
        <div className="shrink-0">
          <ArtifactActions
            artifact={artifact}
            readyCount={readyCount}
            regeneratePending={regeneratePending}
            deletePending={deletePending}
            onRegenerate={onRegenerate}
            onDelete={() => {
              onDelete()
              onOpenChange(false)
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function StudioPane({ workspaceId }: { workspaceId: string }) {
  const {
    data: workspace,
    isLoading: workspaceLoading,
    isError: workspaceError,
    error: workspaceErrorValue,
    refetch: refetchWorkspace,
  } = useWorkspace(workspaceId)
  const sourcesQuery = useSources(workspaceId)
  const artifactsQuery = useArtifacts(workspaceId)
  const createArtifact = useCreateArtifact(workspaceId)
  const regenerateArtifact = useRegenerateArtifact(workspaceId)
  const deleteArtifact = useDeleteArtifact(workspaceId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expandOpen, setExpandOpen] = useState(false)

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

  const readyCount =
    sourcesQuery.data?.filter(
      (source) => source.status === "ready" && source.enabled
    ).length ?? 0

  const artifacts = artifactsQuery.data ?? []
  const selected =
    artifacts.find((artifact) => artifact.id === selectedId) ??
    artifacts[0] ??
    null

  function handleRegenerate(artifactId: string) {
    void regenerateArtifact
      .mutateAsync(artifactId)
      .then(() => toast.success("Regeneration queued"))
      .catch((err: unknown) =>
        toast.error(
          err instanceof Error ? err.message : "Failed to regenerate"
        )
      )
  }

  function handleDelete(artifactId: string) {
    void deleteArtifact
      .mutateAsync(artifactId)
      .then(() => {
        setSelectedId(null)
        toast.success("Artifact removed")
      })
      .catch((err: unknown) =>
        toast.error(err instanceof Error ? err.message : "Failed to delete")
      )
  }

  if (workspaceLoading || sourcesQuery.isLoading || artifactsQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (workspaceError || artifactsQuery.isError) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">
          {(workspaceErrorValue instanceof Error
            ? workspaceErrorValue.message
            : null) ||
            (artifactsQuery.error instanceof Error
              ? artifactsQuery.error.message
              : "Failed to load studio")}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void refetchWorkspace()
            void artifactsQuery.refetch()
          }}
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Notebook overview</p>
        {workspace?.summary ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {workspace.summary}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {readyCount > 0
              ? "Overview appears after source summaries finish."
              : "Add ready sources to unlock Studio generation."}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Generate</p>
        <div className="flex flex-wrap gap-1.5">
          {ARTIFACT_TYPES.map((type) => (
            <Button
              key={type}
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={createArtifact.isPending || readyCount === 0}
              onClick={() => {
                void createArtifact
                  .mutateAsync(type as ArtifactType)
                  .then((artifact) => {
                    setSelectedId(artifact.id)
                    toast.success(`${ARTIFACT_TYPE_LABELS[type]} queued`)
                  })
                  .catch((err: unknown) =>
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Failed to start generation"
                    )
                  )
              }}
            >
              {ARTIFACT_TYPE_LABELS[type]}
            </Button>
          ))}
        </div>
        {readyCount === 0 ? (
          <p className="text-xs text-muted-foreground">
            Needs at least one enabled ready source.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Artifacts</p>
        {artifacts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No artifacts yet. Generate a briefing, FAQ, flashcards, quiz, or
            mind map.
          </p>
        ) : (
          <ul className="space-y-1">
            {artifacts.map((artifact) => (
              <li key={artifact.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(artifact.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                    selected?.id === artifact.id
                      ? "border-foreground/20 bg-muted"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <span className="truncate font-medium">
                    {ARTIFACT_TYPE_LABELS[artifact.type]}
                  </span>
                  <Badge
                    variant={statusVariant(artifact.status)}
                    className="text-[10px]"
                  >
                    {statusLabel(artifact.status)}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected ? (
        <div className="space-y-2 border-t pt-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-medium">
                {ARTIFACT_TYPE_LABELS[selected.type]}
              </p>
              <Badge variant={statusVariant(selected.status)}>
                {statusLabel(selected.status)}
              </Badge>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="shrink-0"
              disabled={selected.status !== "ready" || !selected.content}
              onClick={() => setExpandOpen(true)}
              aria-label="Expand artifact"
              title="Expand"
            >
              <Maximize2Icon className="size-4" />
            </Button>
          </div>
          <ArtifactBody artifact={selected} />
          <ArtifactActions
            artifact={selected}
            readyCount={readyCount}
            regeneratePending={regenerateArtifact.isPending}
            deletePending={deleteArtifact.isPending}
            onRegenerate={() => handleRegenerate(selected.id)}
            onDelete={() => handleDelete(selected.id)}
          />
          <ArtifactExpandDialog
            artifact={selected}
            open={expandOpen}
            onOpenChange={setExpandOpen}
            readyCount={readyCount}
            regeneratePending={regenerateArtifact.isPending}
            deletePending={deleteArtifact.isPending}
            onRegenerate={() => handleRegenerate(selected.id)}
            onDelete={() => handleDelete(selected.id)}
          />
        </div>
      ) : null}
    </div>
  )
}

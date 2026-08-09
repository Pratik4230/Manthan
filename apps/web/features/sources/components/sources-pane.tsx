"use client"

import { useForm } from "@tanstack/react-form"
import { upload } from "@imagekit/next"
import { PlusIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { fetchUploadAuth } from "@/features/sources/api"
import { DuplicateSourceDialog } from "@/features/sources/components/duplicate-source-dialog"
import { SourceStatusBadge } from "@/features/sources/components/source-status-badge"
import { isDuplicateSourceError } from "@/features/sources/errors"
import { hashFileSha256 } from "@/features/sources/file-hash"
import {
  ACCEPT_FILE_TYPES,
  getFileExtension,
  isAllowedMimeType,
  resolveMimeType,
} from "@/features/sources/file-types"
import {
  useCreateFileSource,
  useCreateWebSource,
  useCreateYoutubeSource,
  useDeleteSource,
  useRetrySource,
  useSources,
} from "@/features/sources/hooks"
import {
  addWebSourceSchema,
  addYoutubeSourceSchema,
} from "@/features/sources/schemas"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Progress } from "@workspace/ui/components/progress"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import { Skeleton } from "@workspace/ui/components/skeleton"
import type { SourceDto } from "@/server/sources/service"
import { cn } from "@workspace/ui/lib/utils"

type PendingDuplicate =
  | {
      kind: "file"
      existingSource: SourceDto
      payload: {
        title: string
        fileName: string
        fileSize: number
        mimeType: string
        imageKitFileId: string
        imageKitUrl: string
        extension: string
        clientContentHash: string
      }
    }
  | {
      kind: "web"
      existingSource: SourceDto
      payload: { url: string }
    }
  | {
      kind: "youtube"
      existingSource: SourceDto
      payload: { url: string }
    }

function sourceSubtitle(source: {
  type: string
  fileName: string | null
  url: string | null
}) {
  if (source.type === "file") {
    return source.fileName
  }
  return source.url
}

function AddSourceSheet({
  workspaceId,
  onDuplicate,
}: {
  workspaceId: string
  onDuplicate: (pending: PendingDuplicate) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const createSource = useCreateFileSource(workspaceId)
  const createWebSource = useCreateWebSource(workspaceId)
  const createYoutubeSource = useCreateYoutubeSource(workspaceId)

  const webForm = useForm({
    defaultValues: { url: "" },
    validators: {
      onSubmit: addWebSourceSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await createWebSource.mutateAsync({ url: value.url })
        toast.success("Web page added")
        webForm.reset()
        setOpen(false)
      } catch (err) {
        if (isDuplicateSourceError(err)) {
          onDuplicate({
            kind: "web",
            existingSource: err.existingSource,
            payload: { url: value.url },
          })
          return
        }
        toast.error(err instanceof Error ? err.message : "Failed to add URL")
      }
    },
  })

  const youtubeForm = useForm({
    defaultValues: { url: "" },
    validators: {
      onSubmit: addYoutubeSourceSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await createYoutubeSource.mutateAsync({ url: value.url })
        toast.success("YouTube video added")
        youtubeForm.reset()
        setOpen(false)
      } catch (err) {
        if (isDuplicateSourceError(err)) {
          onDuplicate({
            kind: "youtube",
            existingSource: err.existingSource,
            payload: { url: value.url },
          })
          return
        }
        toast.error(
          err instanceof Error ? err.message : "Failed to add YouTube URL"
        )
      }
    },
  })

  async function handleFiles(files: FileList | null) {
    const file = files?.item(0)
    if (!file) {
      return
    }

    const extension = getFileExtension(file.name)
    if (!extension) {
      toast.error("Unsupported file type. Use pdf, docx, xlsx, csv, txt, or md.")
      return
    }

    const mimeType = resolveMimeType(file, extension)
    if (!isAllowedMimeType(mimeType)) {
      toast.error("Unsupported file type.")
      return
    }

    setUploading(true)
    setProgress(0)

    let uploadedFileId: string | null = null
    let uploadedFileUrl: string | null = null

    try {
      const auth = await fetchUploadAuth()
      const clientContentHash = await hashFileSha256(file)
      const result = await upload({
        file,
        fileName: file.name,
        publicKey: auth.publicKey,
        signature: auth.signature,
        expire: auth.expire,
        token: auth.token,
        folder: `/manthan/${workspaceId}`,
        useUniqueFileName: true,
        onProgress: (event) => {
          if (event.total > 0) {
            setProgress(Math.round((event.loaded / event.total) * 100))
          }
        },
      })

      if (!result.fileId || !result.url) {
        throw new Error("Upload succeeded but file metadata is missing")
      }

      uploadedFileId = result.fileId
      uploadedFileUrl = result.url

      await createSource.mutateAsync({
        title: file.name.replace(/\.[^.]+$/, "") || file.name,
        fileName: file.name,
        fileSize: file.size,
        mimeType,
        imageKitFileId: result.fileId,
        imageKitUrl: result.url,
        extension,
        clientContentHash,
      })

      toast.success("File uploaded")
      setOpen(false)
    } catch (err) {
      if (isDuplicateSourceError(err) && uploadedFileId && uploadedFileUrl) {
        const clientContentHash = await hashFileSha256(file)
        onDuplicate({
          kind: "file",
          existingSource: err.existingSource,
          payload: {
            title: file.name.replace(/\.[^.]+$/, "") || file.name,
            fileName: file.name,
            fileSize: file.size,
            mimeType,
            imageKitFileId: uploadedFileId,
            imageKitUrl: uploadedFileUrl,
            extension,
            clientContentHash,
          },
        })
        return
      }
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
      setProgress(null)
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="w-full gap-1">
          <PlusIcon className="size-3.5" />
          Add
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add source</SheetTitle>
          <SheetDescription>
            Upload a file or paste a web or YouTube URL.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4 pb-4">
          <div className="space-y-2">
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={ACCEPT_FILE_TYPES}
              disabled={uploading}
              onChange={(event) => void handleFiles(event.target.files)}
            />
            <Button
              className="w-full"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? "Uploading…" : "Upload file"}
            </Button>
            <p className="text-xs text-muted-foreground">
              PDF, DOCX, XLSX, CSV, TXT, MD
            </p>
            {progress !== null ? (
              <Progress value={progress} className="h-2" />
            ) : null}
          </div>

          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()
              void webForm.handleSubmit()
            }}
          >
            <FieldGroup>
              <webForm.Field name="url">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor="web-url">Web URL</FieldLabel>
                      <Input
                        id="web-url"
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="https://example.com/article"
                        disabled={createWebSource.isPending}
                        aria-invalid={isInvalid}
                      />
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  )
                }}
              </webForm.Field>
            </FieldGroup>
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              disabled={createWebSource.isPending}
            >
              {createWebSource.isPending ? "Adding…" : "Add web page"}
            </Button>
          </form>

          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()
              void youtubeForm.handleSubmit()
            }}
          >
            <FieldGroup>
              <youtubeForm.Field name="url">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor="youtube-url">YouTube URL</FieldLabel>
                      <Input
                        id="youtube-url"
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="https://www.youtube.com/watch?v=…"
                        disabled={createYoutubeSource.isPending}
                        aria-invalid={isInvalid}
                      />
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  )
                }}
              </youtubeForm.Field>
            </FieldGroup>
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              disabled={createYoutubeSource.isPending}
            >
              {createYoutubeSource.isPending ? "Adding…" : "Add YouTube video"}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function SourcesPane({ workspaceId }: { workspaceId: string }) {
  const { data, isLoading, isError, error, refetch } = useSources(workspaceId)
  const deleteSource = useDeleteSource(workspaceId)
  const retrySource = useRetrySource(workspaceId)
  const createFileSource = useCreateFileSource(workspaceId)
  const createWebSource = useCreateWebSource(workspaceId)
  const createYoutubeSource = useCreateYoutubeSource(workspaceId)
  const [pendingDuplicate, setPendingDuplicate] =
    useState<PendingDuplicate | null>(null)
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [duplicatePending, setDuplicatePending] = useState(false)
  const [highlightSourceId, setHighlightSourceId] = useState<string | null>(
    null
  )

  useEffect(() => {
    if (!highlightSourceId) {
      return
    }
    const element = document.getElementById(`source-${highlightSourceId}`)
    element?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    const timeout = window.setTimeout(() => setHighlightSourceId(null), 3000)
    return () => window.clearTimeout(timeout)
  }, [highlightSourceId, data])

  function handleDuplicate(pending: PendingDuplicate) {
    setPendingDuplicate(pending)
    setDuplicateOpen(true)
  }

  async function resolveDuplicate(
    action: "open" | "replace" | "anyway"
  ): Promise<void> {
    if (!pendingDuplicate) {
      return
    }

    if (action === "open") {
      setHighlightSourceId(pendingDuplicate.existingSource.id)
      setDuplicateOpen(false)
      setPendingDuplicate(null)
      return
    }

    setDuplicatePending(true)
    try {
      const options =
        action === "replace"
          ? { replaceSourceId: pendingDuplicate.existingSource.id }
          : { forceDuplicate: true }

      if (pendingDuplicate.kind === "file") {
        await createFileSource.mutateAsync({
          ...pendingDuplicate.payload,
          ...options,
        })
        toast.success(
          action === "replace" ? "Source replaced" : "Duplicate source added"
        )
      } else if (pendingDuplicate.kind === "web") {
        await createWebSource.mutateAsync({
          ...pendingDuplicate.payload,
          ...options,
        })
        toast.success(
          action === "replace" ? "Source re-indexed" : "Duplicate source added"
        )
      } else {
        await createYoutubeSource.mutateAsync({
          ...pendingDuplicate.payload,
          ...options,
        })
        toast.success(
          action === "replace" ? "Source re-indexed" : "Duplicate source added"
        )
      }

      setDuplicateOpen(false)
      setPendingDuplicate(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to resolve duplicate"
      )
    } finally {
      setDuplicatePending(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <AddSourceSheet workspaceId={workspaceId} onDuplicate={handleDuplicate} />

      <DuplicateSourceDialog
        open={duplicateOpen}
        onOpenChange={(open) => {
          setDuplicateOpen(open)
          if (!open) {
            setPendingDuplicate(null)
          }
        }}
        existingSource={pendingDuplicate?.existingSource ?? null}
        kind={pendingDuplicate?.kind ?? null}
        pending={duplicatePending}
        onOpenExisting={() => void resolveDuplicate("open")}
        onReplace={() => void resolveDuplicate("replace")}
        onAddAnyway={() => void resolveDuplicate("anyway")}
      />

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : null}

      {isError ? (
        <div className="space-y-2">
          <p className="text-xs text-destructive">
            {error instanceof Error ? error.message : "Failed to load sources"}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : null}

      {!isLoading && !isError && data?.length === 0 ? (
        <p className="px-0.5 text-xs text-muted-foreground">
          No sources yet. Tap Add to upload a file or paste a URL.
        </p>
      ) : null}

      <ul className="space-y-1.5">
        {data?.map((source) => {
          const canRetry =
            source.status === "failed" || source.status === "ready"
          return (
            <li
              key={source.id}
              id={`source-${source.id}`}
              className={cn(
                "rounded-lg border p-2 transition-colors",
                highlightSourceId === source.id &&
                  "border-emerald-500 ring-2 ring-emerald-500/40"
              )}
            >
              <div className="space-y-1.5">
                <p className="truncate text-xs font-medium leading-snug">
                  {source.title}
                </p>
                <SourceStatusBadge source={source} />
                {source.error ? (
                  <p className="text-[10px] text-destructive">{source.error}</p>
                ) : null}
                {source.summary ? (
                  <p className="line-clamp-3 text-[10px] leading-snug text-muted-foreground">
                    {source.summary}
                  </p>
                ) : null}
                <p className="truncate text-[10px] text-muted-foreground">
                  {sourceSubtitle(source)}
                </p>
                <div className="flex flex-col gap-1">
                  {canRetry ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-full px-2 text-xs"
                      disabled={retrySource.isPending}
                      onClick={() => {
                        void retrySource
                          .mutateAsync(source.id)
                          .then(() =>
                            toast.success(
                              source.status === "failed"
                                ? "Retry queued"
                                : "Re-index queued"
                            )
                          )
                          .catch((err: unknown) =>
                            toast.error(
                              err instanceof Error
                                ? err.message
                                : "Failed to retry ingest"
                            )
                          )
                      }}
                    >
                      {source.status === "failed" ? "Retry" : "Re-index"}
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-full px-2 text-xs"
                    disabled={deleteSource.isPending}
                    onClick={() => {
                      void deleteSource
                        .mutateAsync(source.id)
                        .then(() => toast.success("Source removed"))
                        .catch((err: unknown) =>
                          toast.error(
                            err instanceof Error
                              ? err.message
                              : "Failed to delete source"
                          )
                        )
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

"use client"

import { useForm } from "@tanstack/react-form"
import { upload } from "@imagekit/next"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { fetchUploadAuth } from "@/features/sources/api"
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
  useSources,
} from "@/features/sources/hooks"
import {
  addWebSourceSchema,
  addYoutubeSourceSchema,
} from "@/features/sources/schemas"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Progress } from "@workspace/ui/components/progress"
import { Skeleton } from "@workspace/ui/components/skeleton"

function statusLabel(status: string) {
  if (status === "pending") return "Queued"
  if (status === "processing") return "Processing"
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

export function SourcesPane({ workspaceId }: { workspaceId: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const { data, isLoading, isError, error, refetch } = useSources(workspaceId)
  const createSource = useCreateFileSource(workspaceId)
  const createWebSource = useCreateWebSource(workspaceId)
  const createYoutubeSource = useCreateYoutubeSource(workspaceId)
  const deleteSource = useDeleteSource(workspaceId)

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
      } catch (err) {
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
      } catch (err) {
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

    try {
      const auth = await fetchUploadAuth()
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

      await createSource.mutateAsync({
        title: file.name.replace(/\.[^.]+$/, "") || file.name,
        fileName: file.name,
        fileSize: file.size,
        mimeType,
        imageKitFileId: result.fileId,
        imageKitUrl: result.url,
        extension,
      })

      toast.success("File uploaded")
    } catch (err) {
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
    <div className="flex h-full flex-col gap-4">
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
                    onChange={(event) => field.handleChange(event.target.value)}
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
                    onChange={(event) => field.handleChange(event.target.value)}
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

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : null}

      {isError ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load sources"}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : null}

      {!isLoading && !isError && data?.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sources yet. Upload a file, add a web page, or paste a YouTube
          link.
        </p>
      ) : null}

      <ul className="space-y-2">
        {data?.map((source) => (
          <li key={source.id} className="rounded-xl border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-medium">{source.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {sourceSubtitle(source)}
                </p>
                <Badge variant={statusVariant(source.status)}>
                  {statusLabel(source.status)}
                </Badge>
                {source.error ? (
                  <p className="text-xs text-destructive">{source.error}</p>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="sm"
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
          </li>
        ))}
      </ul>
    </div>
  )
}

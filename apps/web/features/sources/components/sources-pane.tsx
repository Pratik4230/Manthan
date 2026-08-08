"use client"

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
  useDeleteSource,
  useSources,
} from "@/features/sources/hooks"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
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

export function SourcesPane({ workspaceId }: { workspaceId: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const { data, isLoading, isError, error, refetch } = useSources(workspaceId)
  const createSource = useCreateFileSource(workspaceId)
  const deleteSource = useDeleteSource(workspaceId)

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
          No sources yet. Upload a document to get started.
        </p>
      ) : null}

      <ul className="space-y-2">
        {data?.map((source) => (
          <li
            key={source.id}
            className="rounded-xl border p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-medium">{source.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {source.fileName}
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

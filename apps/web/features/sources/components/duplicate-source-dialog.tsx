"use client"

import type { SourceDto } from "@/server/sources/service"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

export type DuplicateSourceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingSource: SourceDto | null
  kind: "file" | "web" | "youtube" | null
  pending: boolean
  onOpenExisting: () => void
  onReplace: () => void
  onAddAnyway: () => void
}

function kindLabel(kind: DuplicateSourceDialogProps["kind"]) {
  if (kind === "file") return "file"
  if (kind === "youtube") return "YouTube video"
  return "web page"
}

export function DuplicateSourceDialog({
  open,
  onOpenChange,
  existingSource,
  kind,
  pending,
  onOpenExisting,
  onReplace,
  onAddAnyway,
}: DuplicateSourceDialogProps) {
  if (!existingSource || !kind) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>Source already exists</DialogTitle>
          <DialogDescription>
            This {kindLabel(kind)} is already in this workspace as{" "}
            <span className="font-medium text-foreground">
              {existingSource.title}
            </span>
            .
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:flex-col">
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={pending}
            onClick={onOpenExisting}
          >
            Open existing
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={pending}
            onClick={onReplace}
          >
            Replace &amp; re-index
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={pending}
            onClick={onAddAnyway}
          >
            Add anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

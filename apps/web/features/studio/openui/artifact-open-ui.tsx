"use client"

import { Renderer } from "@openuidev/react-lang"
import { openuiLibrary } from "@openuidev/react-ui/genui-lib"
import { useMemo } from "react"

import { artifactContentToMarkdown } from "@/features/studio/format"
import { artifactToOpenUIProgram } from "@/lib/artifacts/openui-serialize"
import type { ArtifactDto } from "@/server/artifacts"
import { cn } from "@workspace/ui/lib/utils"

import "@openuidev/react-ui/components.css"
import "@openuidev/react-ui/layered/styles/index.css"

type ArtifactOpenUIViewProps = {
  artifact: ArtifactDto
  expanded?: boolean
}

export function ArtifactOpenUIView({
  artifact,
  expanded = false,
}: ArtifactOpenUIViewProps) {
  const program = useMemo(
    () => artifactToOpenUIProgram(artifact.type, artifact.content),
    [artifact.type, artifact.content]
  )

  const markdown = useMemo(
    () => artifactContentToMarkdown(artifact.type, artifact.content),
    [artifact.type, artifact.content]
  )

  if (!program) {
    return (
      <pre
        className={cn(
          "whitespace-pre-wrap leading-relaxed",
          expanded
            ? "text-sm"
            : "max-h-80 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs"
        )}
      >
        {markdown || "No content"}
      </pre>
    )
  }

  return (
    <div
      className={cn(
        "manthan-studio-openui text-foreground",
        expanded
          ? "min-h-0"
          : "max-h-80 overflow-auto rounded-lg border bg-muted/20 p-2"
      )}
    >
      <Renderer
        response={program}
        library={openuiLibrary}
        isStreaming={false}
      />
    </div>
  )
}

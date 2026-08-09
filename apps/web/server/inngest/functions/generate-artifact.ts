import { generateArtifactContent } from "@/server/artifacts/generate"
import {
  getArtifactById,
  setArtifactReady,
  setArtifactStatus,
} from "@/server/artifacts/service"
import { inngest } from "@/server/inngest/client"
import type { ArtifactType } from "@/server/models/artifact"

export const generateArtifact = inngest.createFunction(
  {
    id: "generate-artifact",
    triggers: [{ event: "artifact/generate.requested" }],
    retries: 2,
  },
  async ({ event, step }) => {
    const { artifactId, workspaceId, ownerId, type } = event.data as {
      artifactId: string
      workspaceId: string
      ownerId: string
      type: ArtifactType
    }

    await step.run("mark-processing", async () => {
      await setArtifactStatus(artifactId, "processing")
    })

    const exists = await step.run("load-artifact", async () => {
      const artifact = await getArtifactById(artifactId)
      return artifact
        ? { ok: true as const, type: artifact.type }
        : { ok: false as const }
    })

    if (!exists.ok) {
      await step.run("mark-failed-missing", async () => {
        await setArtifactStatus(artifactId, "failed", "Artifact not found")
      })
      return { artifactId, status: "failed" }
    }

    const generated = await step.run("generate-content", async () => {
      try {
        const content = await generateArtifactContent({
          workspaceId,
          ownerId,
          type: type ?? exists.type,
        })
        return { ok: true as const, content }
      } catch (error) {
        return {
          ok: false as const,
          error:
            error instanceof Error
              ? error.message
              : "Artifact generation failed",
        }
      }
    })

    if (!generated.ok) {
      await step.run("mark-failed", async () => {
        await setArtifactStatus(artifactId, "failed", generated.error)
      })
      return { artifactId, status: "failed", error: generated.error }
    }

    await step.run("mark-ready", async () => {
      await setArtifactReady(artifactId, generated.content)
    })

    return {
      artifactId,
      status: "ready",
      type: type ?? exists.type,
    }
  }
)

import { runSourceIngest } from "@/server/ingest/pipeline"
import { inngest } from "@/server/inngest/client"
import { getSourceById, setSourceStatus } from "@/server/sources/service"

export const ingestSource = inngest.createFunction(
  {
    id: "ingest-source",
    triggers: [{ event: "source/ingest.requested" }],
    retries: 3,
  },
  async ({ event, step }) => {
    const { sourceId } = event.data as {
      sourceId: string
      workspaceId: string
      ownerId: string
      sourceType?: string
    }

    await step.run("mark-processing", async () => {
      await setSourceStatus(sourceId, "processing")
    })

    const exists = await step.run("load-source", async () => {
      const source = await getSourceById(sourceId)
      return source
        ? { ok: true as const, type: source.type }
        : { ok: false as const }
    })

    if (!exists.ok) {
      await step.run("mark-failed-missing", async () => {
        await setSourceStatus(sourceId, "failed", "Source not found")
      })
      return { sourceId, status: "failed" }
    }

    const ingested = await step.run("extract-chunk-embed", async () => {
      try {
        const result = await runSourceIngest(sourceId)
        return { ok: true as const, ...result }
      } catch (error) {
        return {
          ok: false as const,
          error:
            error instanceof Error ? error.message : "Source ingest failed",
        }
      }
    })

    if (!ingested.ok) {
      await step.run("mark-failed", async () => {
        await setSourceStatus(sourceId, "failed", ingested.error)
      })
      return { sourceId, status: "failed", error: ingested.error }
    }

    return {
      sourceId,
      status: "ready",
      sourceType: ingested.sourceType,
      chunkCount: ingested.chunkCount,
    }
  }
)

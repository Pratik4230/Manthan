import {
  chunkSourceContent,
  embedSourceContent,
  extractSourceContent,
  finalizeSourceIngest,
  summarizeSourceContent,
} from "@/server/ingest/pipeline"
import { inngest } from "@/server/inngest/client"
import {
  getSourceById,
  setIngestStage,
  setSourceStatus,
} from "@/server/sources/service"

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
      await setIngestStage(sourceId, "queued")
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

    const extracted = await step.run("extract", async () => {
      try {
        const result = await extractSourceContent(sourceId)
        return { ok: true as const, text: result.text }
      } catch (error) {
        return {
          ok: false as const,
          error:
            error instanceof Error ? error.message : "Source extract failed",
        }
      }
    })

    if (!extracted.ok) {
      await step.run("mark-failed-extract", async () => {
        await setSourceStatus(sourceId, "failed", extracted.error)
      })
      return { sourceId, status: "failed", error: extracted.error }
    }

    const chunked = await step.run("chunk", async () => {
      try {
        const chunks = await chunkSourceContent(sourceId)
        return { ok: true as const, chunkCount: chunks.length }
      } catch (error) {
        return {
          ok: false as const,
          error:
            error instanceof Error ? error.message : "Source chunking failed",
        }
      }
    })

    if (!chunked.ok) {
      await step.run("mark-failed-chunk", async () => {
        await setSourceStatus(sourceId, "failed", chunked.error)
      })
      return { sourceId, status: "failed", error: chunked.error }
    }

    const embedded = await step.run("embed", async () => {
      try {
        const result = await embedSourceContent(sourceId)
        return { ok: true as const, chunkCount: result.chunkCount }
      } catch (error) {
        return {
          ok: false as const,
          error:
            error instanceof Error ? error.message : "Source embedding failed",
        }
      }
    })

    if (!embedded.ok) {
      await step.run("mark-failed-embed", async () => {
        await setSourceStatus(sourceId, "failed", embedded.error)
      })
      return { sourceId, status: "failed", error: embedded.error }
    }

    const summarized = await step.run("summarize", async () => {
      try {
        const summary = await summarizeSourceContent(sourceId, extracted.text)
        return { ok: true as const, summary }
      } catch (error) {
        return {
          ok: false as const,
          error:
            error instanceof Error ? error.message : "Source summary failed",
        }
      }
    })

    if (!summarized.ok) {
      await step.run("mark-failed-summarize", async () => {
        await setSourceStatus(sourceId, "failed", summarized.error)
      })
      return { sourceId, status: "failed", error: summarized.error }
    }

    await step.run("finalize", async () => {
      await finalizeSourceIngest(sourceId, summarized.summary)
    })

    return {
      sourceId,
      status: "ready",
      sourceType: exists.type,
      chunkCount: embedded.chunkCount,
    }
  }
)

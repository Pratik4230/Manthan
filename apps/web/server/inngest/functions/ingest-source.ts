import { finalizeExtractedSource } from "@/server/ingest/finalize"
import { scrapeWebPage } from "@/server/integrations/firecrawl"
import { fetchYoutubeTranscriptText } from "@/server/integrations/youtube"
import { inngest } from "@/server/inngest/client"
import { getSourceById, setSourceStatus } from "@/server/sources/service"

export const ingestSource = inngest.createFunction(
  {
    id: "ingest-source",
    triggers: [{ event: "source/ingest.requested" }],
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

    const sourceType = await step.run("load-source-type", async () => {
      const source = await getSourceById(sourceId)
      return source?.type ?? null
    })

    if (!sourceType) {
      await step.run("mark-failed-missing", async () => {
        await setSourceStatus(sourceId, "failed", "Source not found")
      })
      return { sourceId, status: "failed" }
    }

    if (sourceType === "web") {
      const extract = await step.run("firecrawl-scrape", async () => {
        try {
          const source = await getSourceById(sourceId)
          if (!source?.url) {
            return { ok: false as const, error: "Source URL missing" }
          }
          const text = await scrapeWebPage(source.url)
          return { ok: true as const, text }
        } catch (error) {
          return {
            ok: false as const,
            error:
              error instanceof Error ? error.message : "Firecrawl scrape failed",
          }
        }
      })

      if (!extract.ok) {
        await step.run("mark-failed-web", async () => {
          await setSourceStatus(sourceId, "failed", extract.error)
        })
        return { sourceId, status: "failed" }
      }

      await step.run("finalize-web", async () => {
        await finalizeExtractedSource(sourceId, extract.text)
      })

      return { sourceId, status: "ready" }
    }

    if (sourceType === "youtube") {
      const extract = await step.run("youtube-transcript", async () => {
        try {
          const source = await getSourceById(sourceId)
          if (!source?.url) {
            return { ok: false as const, error: "Source URL missing" }
          }
          const text = await fetchYoutubeTranscriptText(source.url)
          return { ok: true as const, text }
        } catch (error) {
          return {
            ok: false as const,
            error:
              error instanceof Error
                ? error.message
                : "YouTube transcript fetch failed",
          }
        }
      })

      if (!extract.ok) {
        await step.run("mark-failed-youtube", async () => {
          await setSourceStatus(sourceId, "failed", extract.error)
        })
        return { sourceId, status: "failed" }
      }

      await step.run("finalize-youtube", async () => {
        await finalizeExtractedSource(sourceId, extract.text)
      })

      return { sourceId, status: "ready" }
    }

    await step.run("mark-ready-upload-complete", async () => {
      await setSourceStatus(sourceId, "ready")
    })

    return { sourceId, status: "ready" }
  }
)

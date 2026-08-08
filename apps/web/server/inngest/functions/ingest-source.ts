import { inngest } from "@/server/inngest/client"
import { setSourceStatus } from "@/server/sources/service"

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
    }

    await step.run("mark-processing", async () => {
      await setSourceStatus(sourceId, "processing")
    })

    await step.run("mark-ready-upload-complete", async () => {
      await setSourceStatus(sourceId, "ready")
    })

    return { sourceId, status: "ready" }
  }
)

import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { ObjectId } from "mongodb"

import { createChatModel } from "@/server/integrations/openai"
import { getSourcesCollection } from "@/server/sources/collection"
import { getWorkspacesCollection } from "@/server/workspaces/collection"

const MAX_EXCERPT_CHARS = 12_000

export async function generateSourceSummary(
  title: string,
  text: string
): Promise<string | null> {
  const trimmed = text.trim()
  if (!trimmed) {
    return null
  }

  const excerpt = trimmed.slice(0, MAX_EXCERPT_CHARS)
  const model = createChatModel()
  const response = await model.invoke([
    new SystemMessage(
      [
        "You write short factual summaries for a research notebook.",
        "Use ONLY the provided excerpt.",
        "Write 2-3 sentences.",
        "Do not invent facts or cite outside knowledge.",
        "Do not use bullet points.",
      ].join(" ")
    ),
    new HumanMessage(`Title: ${title}\n\nExcerpt:\n${excerpt}`),
  ])

  const summary = response.text.trim()
  return summary || null
}

export async function generateNotebookSummary(
  sources: Array<{ title: string; summary: string }>
): Promise<string | null> {
  if (sources.length === 0) {
    return null
  }

  const model = createChatModel()
  const listing = sources
    .map((source, index) => `${index + 1}. ${source.title}: ${source.summary}`)
    .join("\n")

  const response = await model.invoke([
    new SystemMessage(
      [
        "You write a short notebook overview from source summaries.",
        "Use ONLY the provided source summaries.",
        "Write 2-4 sentences covering what this notebook is about.",
        "Do not invent facts.",
      ].join(" ")
    ),
    new HumanMessage(`Source summaries:\n${listing}`),
  ])

  const summary = response.text.trim()
  return summary || null
}

export async function refreshWorkspaceSummary(
  workspaceId: string,
  ownerId: string
): Promise<void> {
  if (!ObjectId.isValid(workspaceId)) {
    return
  }

  const sourcesCollection = await getSourcesCollection()
  const sources = await sourcesCollection
    .find({
      workspaceId,
      ownerId,
      status: "ready",
      summary: { $type: "string", $ne: "" },
    })
    .project({ title: 1, summary: 1 })
    .toArray()

  const withSummaries = sources
    .map((source) => ({
      title: source.title,
      summary: typeof source.summary === "string" ? source.summary : "",
    }))
    .filter((source) => source.summary.trim().length > 0)

  const summary =
    withSummaries.length > 0
      ? await generateNotebookSummary(withSummaries)
      : null

  const workspaces = await getWorkspacesCollection()
  await workspaces.updateOne(
    { _id: new ObjectId(workspaceId), ownerId, deletedAt: null },
    {
      $set: {
        summary,
        updatedAt: new Date(),
      },
    }
  )
}

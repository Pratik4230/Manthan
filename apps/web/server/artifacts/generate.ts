import { HumanMessage, SystemMessage } from "@langchain/core/messages"

import type { ArtifactType } from "@/server/models/artifact"
import { createChatModel } from "@/server/integrations/openai"
import { searchWorkspaceChunks } from "@/server/vector/retrieve"
import { listEnabledReadySourceIds } from "@/server/sources/service"

const RETRIEVE_K = 14

const TYPE_QUERY: Record<ArtifactType, string> = {
  briefing: "overview key themes findings conclusions main ideas",
  faq: "frequently asked questions important clarifications definitions",
  flashcards: "key terms definitions facts concepts to memorize",
  quiz: "important facts concepts that can be tested with questions",
  mind_map: "main topics subtopics hierarchy structure outline",
}

function formatContext(
  hits: Array<{ text: string; sourceId: string }>
): string {
  return hits
    .map((hit, index) => `[${index + 1}] (source ${hit.sourceId})\n${hit.text}`)
    .join("\n\n")
}

function buildPrompt(type: ArtifactType, context: string): {
  system: string
  user: string
} {
  const common = [
    "You generate study materials for a research notebook.",
    "Use ONLY the provided source excerpts.",
    "Do not invent facts outside the excerpts.",
    "Respond with valid JSON only. No markdown fences.",
  ].join(" ")

  if (type === "briefing") {
    return {
      system: common,
      user: `${context}\n\nReturn JSON: {"markdown":"2-5 paragraph briefing in markdown"}`,
    }
  }

  if (type === "faq") {
    return {
      system: common,
      user: `${context}\n\nReturn JSON: {"items":[{"question":"...","answer":"..."}]} with 5-10 items`,
    }
  }

  if (type === "flashcards") {
    return {
      system: common,
      user: `${context}\n\nReturn JSON: {"cards":[{"front":"...","back":"..."}]} with 8-16 cards`,
    }
  }

  if (type === "quiz") {
    return {
      system: common,
      user: `${context}\n\nReturn JSON: {"questions":[{"question":"...","options":["A","B","C","D"],"answer":"A","explanation":"..."}]} with 5-10 questions`,
    }
  }

  return {
    system: common,
    user: `${context}\n\nReturn JSON: {"root":"Main topic","branches":[{"label":"...","children":["..."]}]} covering the main structure`,
  }
}

function parseJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced?.[1]?.trim() ?? trimmed
  const parsed = JSON.parse(raw) as unknown
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Model did not return a JSON object")
  }
  return parsed as Record<string, unknown>
}

export async function generateArtifactContent(input: {
  workspaceId: string
  ownerId: string
  type: ArtifactType
}): Promise<Record<string, unknown>> {
  const sourceIds = await listEnabledReadySourceIds(
    input.ownerId,
    input.workspaceId
  )

  if (sourceIds.length === 0) {
    throw new Error("No ready sources available for generation")
  }

  const hits = await searchWorkspaceChunks({
    workspaceId: input.workspaceId,
    query: TYPE_QUERY[input.type],
    k: RETRIEVE_K,
    sourceIds,
  })

  if (hits.length === 0) {
    throw new Error("No relevant source excerpts found")
  }

  const { system, user } = buildPrompt(input.type, formatContext(hits))
  const model = createChatModel()
  const response = await model.invoke([
    new SystemMessage(system),
    new HumanMessage(user),
  ])

  return parseJsonObject(response.text)
}

export function artifactContentToMarkdown(
  type: ArtifactType,
  content: Record<string, unknown> | null
): string {
  if (!content) {
    return ""
  }

  if (type === "briefing" && typeof content.markdown === "string") {
    return content.markdown
  }

  if (type === "faq" && Array.isArray(content.items)) {
    return content.items
      .map((item, index) => {
        const row = item as { question?: string; answer?: string }
        return `### ${index + 1}. ${row.question ?? ""}\n\n${row.answer ?? ""}`
      })
      .join("\n\n")
  }

  if (type === "flashcards" && Array.isArray(content.cards)) {
    return content.cards
      .map((card, index) => {
        const row = card as { front?: string; back?: string }
        return `### Card ${index + 1}\n\n**Front:** ${row.front ?? ""}\n\n**Back:** ${row.back ?? ""}`
      })
      .join("\n\n")
  }

  if (type === "quiz" && Array.isArray(content.questions)) {
    return content.questions
      .map((question, index) => {
        const row = question as {
          question?: string
          options?: string[]
          answer?: string
          explanation?: string
        }
        const options = (row.options ?? [])
          .map((option, optionIndex) => `${optionIndex + 1}. ${option}`)
          .join("\n")
        return `### Q${index + 1}. ${row.question ?? ""}\n\n${options}\n\n**Answer:** ${row.answer ?? ""}\n\n${row.explanation ?? ""}`
      })
      .join("\n\n")
  }

  if (type === "mind_map") {
    const root = typeof content.root === "string" ? content.root : "Topics"
    const branches = Array.isArray(content.branches) ? content.branches : []
    const lines = [`# ${root}`, ""]
    for (const branch of branches) {
      const row = branch as { label?: string; children?: string[] }
      lines.push(`## ${row.label ?? ""}`)
      for (const child of row.children ?? []) {
        lines.push(`- ${child}`)
      }
      lines.push("")
    }
    return lines.join("\n").trim()
  }

  return JSON.stringify(content, null, 2)
}

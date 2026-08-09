import type { ArtifactType } from "@/server/models/artifact"

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

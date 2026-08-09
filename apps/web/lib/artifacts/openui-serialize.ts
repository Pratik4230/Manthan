import type { ArtifactType } from "@/server/models/artifact"

export function escapeOpenUIString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r\n/g, "\n")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
}

function normalizeMultiline(value: string): string {
  return value.replace(/\\n/g, "\n").replace(/\r\n/g, "\n")
}

export function artifactToOpenUIProgram(
  type: ArtifactType,
  content: Record<string, unknown> | null
): string | null {
  if (!content) {
    return null
  }

  switch (type) {
    case "briefing":
      return serializeBriefing(content)
    case "faq":
      return serializeFaq(content)
    case "flashcards":
      return serializeFlashcards(content)
    case "quiz":
      return serializeQuiz(content)
    case "mind_map":
      return serializeMindMap(content)
    default:
      return null
  }
}

function serializeBriefing(content: Record<string, unknown>): string | null {
  const markdown =
    typeof content.markdown === "string"
      ? normalizeMultiline(content.markdown.trim())
      : ""
  if (!markdown) {
    return null
  }

  return `root = Stack([body], "column", "m")

body = MarkDownRenderer("${escapeOpenUIString(markdown)}", "sunk")`
}

function serializeFaq(content: Record<string, unknown>): string | null {
  if (!Array.isArray(content.items) || content.items.length === 0) {
    return null
  }

  const lines = [
    `root = Stack([header, body], "column", "m")`,
    ``,
    `header = CardHeader("FAQ", "From your sources")`,
  ]
  const itemRefs: string[] = []

  content.items.forEach((item, index) => {
    const row = item as { question?: string; answer?: string }
    const question = normalizeMultiline(row.question?.trim() ?? `Question ${index + 1}`)
    const answer = normalizeMultiline(row.answer?.trim() ?? "")
    lines.push(`ans${index} = TextContent("${escapeOpenUIString(answer)}")`)
    lines.push(
      `faqItem${index} = AccordionItem("q${index}", "${escapeOpenUIString(question)}", [ans${index}])`
    )
    itemRefs.push(`faqItem${index}`)
  })

  lines.push(``)
  lines.push(`faqAcc = Accordion([${itemRefs.join(", ")}])`)
  lines.push(`body = Card([faqAcc], "sunk")`)

  return lines.join("\n")
}

function serializeFlashcards(content: Record<string, unknown>): string | null {
  if (!Array.isArray(content.cards) || content.cards.length === 0) {
    return null
  }

  const lines = [
    `root = Stack([header, body], "column", "m")`,
    ``,
    `header = CardHeader("Flashcards", "Tap a tab to flip")`,
  ]
  const tabRefs: string[] = []

  content.cards.forEach((card, index) => {
    const row = card as { front?: string; back?: string }
    const front = normalizeMultiline(row.front?.trim() ?? `Card ${index + 1}`)
    const back = normalizeMultiline(row.back?.trim() ?? "")
    lines.push(`back${index} = TextContent("${escapeOpenUIString(back)}")`)
    lines.push(
      `tab${index} = TabItem("c${index}", "${escapeOpenUIString(front)}", [back${index}])`
    )
    tabRefs.push(`tab${index}`)
  })

  lines.push(``)
  lines.push(`tabs = Tabs([${tabRefs.join(", ")}])`)
  lines.push(`body = Card([tabs], "sunk")`)

  return lines.join("\n")
}

function serializeQuiz(content: Record<string, unknown>): string | null {
  if (!Array.isArray(content.questions) || content.questions.length === 0) {
    return null
  }

  const lines = [
    `root = Stack([header, body], "column", "m")`,
    ``,
    `header = CardHeader("Quiz", "Expand each question for the answer")`,
  ]
  const itemRefs: string[] = []

  content.questions.forEach((question, index) => {
    const row = question as {
      question?: string
      options?: string[]
      answer?: string
      explanation?: string
    }
    const prompt = normalizeMultiline(row.question?.trim() ?? `Question ${index + 1}`)
    const options = (row.options ?? [])
      .map((option, optionIndex) => `${optionIndex + 1}. ${option}`)
      .join("\n")
    const answer = normalizeMultiline(row.answer?.trim() ?? "")
    const explanation = normalizeMultiline(row.explanation?.trim() ?? "")
    const answerBlock = [answer ? `**Answer:** ${answer}` : "", explanation]
      .filter(Boolean)
      .join("\n\n")

    lines.push(`opts${index} = TextContent("${escapeOpenUIString(options)}")`)
    if (answerBlock) {
      lines.push(
        `ans${index} = Callout("success", "Solution", "${escapeOpenUIString(answerBlock)}")`
      )
      lines.push(
        `quizItem${index} = AccordionItem("q${index}", "${escapeOpenUIString(prompt)}", [opts${index}, ans${index}])`
      )
    } else {
      lines.push(
        `quizItem${index} = AccordionItem("q${index}", "${escapeOpenUIString(prompt)}", [opts${index}])`
      )
    }
    itemRefs.push(`quizItem${index}`)
  })

  lines.push(``)
  lines.push(`quizAcc = Accordion([${itemRefs.join(", ")}])`)
  lines.push(`body = Card([quizAcc], "sunk")`)

  return lines.join("\n")
}

function serializeMindMap(content: Record<string, unknown>): string | null {
  const root = normalizeMultiline(
    typeof content.root === "string" && content.root.trim()
      ? content.root.trim()
      : "Topics"
  )
  const branches = Array.isArray(content.branches) ? content.branches : []
  if (branches.length === 0) {
    return null
  }

  const lines = [
    `root = Stack([header, body], "column", "m")`,
    ``,
    `header = CardHeader("${escapeOpenUIString(root)}", "Mind map")`,
  ]
  const branchRefs: string[] = []

  branches.forEach((branch, index) => {
    const row = branch as { label?: string; children?: string[] }
    const label = normalizeMultiline(row.label?.trim() ?? `Branch ${index + 1}`)
    const children = (row.children ?? [])
      .map((child) => `- ${child}`)
      .join("\n")
    lines.push(
      `branchText${index} = TextContent("${escapeOpenUIString(children)}")`
    )
    lines.push(
      `branch${index} = Card([CardHeader("${escapeOpenUIString(label)}", ""), branchText${index}], "sunk")`
    )
    branchRefs.push(`branch${index}`)
  })

  lines.push(``)
  lines.push(`body = Stack([${branchRefs.join(", ")}], "column", "s")`)

  return lines.join("\n")
}

export function withOpenUIContent(
  type: ArtifactType,
  content: Record<string, unknown>
): Record<string, unknown> {
  const { openui: _openui, ...rest } = content
  const openui = artifactToOpenUIProgram(type, rest)
  if (!openui) {
    return rest
  }
  return { ...rest, openui }
}

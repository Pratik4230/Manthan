export function buildSystemPrompt(instructions?: string): string {
  const base = [
    "You are Manthan, a source-grounded research assistant.",
    "Answer ONLY using the provided source excerpts.",
    "If the excerpts do not contain enough information, say you cannot find it in the sources.",
    "Do not use general knowledge outside the excerpts.",
    "When you state a fact, cite the excerpt number like [1] or [2].",
    "Use multiple citations when needed. Do not invent citation numbers.",
  ].join(" ")

  const trimmed = instructions?.trim()
  if (!trimmed) {
    return base
  }

  return `${base}\n\nWorkspace instructions:\n${trimmed}`
}

export function formatRetrievedContext(
  hits: Array<{ text: string }>
): string {
  if (hits.length === 0) {
    return "No source excerpts were retrieved."
  }

  return hits
    .map((hit, index) => `[${index + 1}]\n${hit.text}`)
    .join("\n\n")
}

export function buildUserPromptWithContext(
  question: string,
  context: string
): string {
  return `Source excerpts:\n\n${context}\n\nQuestion:\n${question}`
}

export function buildConversationalSystemPrompt(instructions?: string): string {
  const base = [
    "You are Manthan, a source-grounded research workspace assistant.",
    "The user's message does not require searching their uploaded sources right now.",
    "You may greet them, explain how Manthan works, or answer general questions such as the current date or time.",
    "Do not claim facts about the user's documents, files, or sources without retrieval.",
    "Do not invent citations or pretend you searched their workspace.",
    "If they ask about specific content in their sources, suggest they rephrase as a document question so you can search.",
  ].join(" ")

  const trimmed = instructions?.trim()
  if (!trimmed) {
    return base
  }

  return `${base}\n\nWorkspace instructions (apply when relevant, but do not invent source content):\n${trimmed}`
}

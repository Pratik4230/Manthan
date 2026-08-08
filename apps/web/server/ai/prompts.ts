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

import {
  AIMessage,
  type BaseMessage,
  HumanMessage,
} from "@langchain/core/messages"

export function lastUserText(messages: BaseMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (!message || !HumanMessage.isInstance(message)) {
      continue
    }
    return message.text
  }
  return ""
}

export function formatThreadForPrompt(
  messages: BaseMessage[],
  maxMessages = 8
): string {
  const slice = messages.slice(-maxMessages)
  return slice
    .map((message) => {
      const role = HumanMessage.isInstance(message)
        ? "User"
        : AIMessage.isInstance(message)
          ? "Assistant"
          : "System"
      const text = message.text.trim()
      if (!text) {
        return null
      }
      return `${role}: ${text}`
    })
    .filter((line): line is string => Boolean(line))
    .join("\n")
}

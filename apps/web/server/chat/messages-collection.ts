import type { Collection } from "mongodb"

import { collections, getDb } from "@/server/db"
import type { ChatMessageDocument } from "@/server/models/chat-message"

export async function getChatMessagesCollection(): Promise<
  Collection<ChatMessageDocument>
> {
  const db = await getDb()
  return db.collection<ChatMessageDocument>(collections.chatMessages)
}

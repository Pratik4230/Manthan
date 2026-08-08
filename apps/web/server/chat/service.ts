import { ObjectId } from "mongodb"

import { getChatMessagesCollection } from "@/server/chat/messages-collection"
import { getThreadsCollection } from "@/server/chat/threads-collection"
import type { Thread, ThreadStatus } from "@/server/models/thread"
import { getWorkspace } from "@/server/workspaces/service"

export type ThreadDto = {
  id: string
  workspaceId: string
  title: string | null
  status: ThreadStatus
  createdAt: string
  updatedAt: string
}

export type ChatMessageDto = {
  id: string
  threadId: string
  parentId: string | null
  message: Record<string, unknown>
  createdAt: string
}

function toThreadDto(thread: Thread): ThreadDto {
  return {
    id: thread._id.toHexString(),
    workspaceId: thread.workspaceId,
    title: thread.title,
    status: thread.status,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
  }
}

async function assertWorkspaceOwner(ownerId: string, workspaceId: string) {
  const workspace = await getWorkspace(ownerId, workspaceId)
  if (!workspace) {
    throw new Response(JSON.stringify({ error: "Workspace not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }
  return workspace
}

async function getOwnedThread(
  ownerId: string,
  workspaceId: string,
  threadId: string
): Promise<Thread | null> {
  if (!ObjectId.isValid(threadId)) {
    return null
  }
  const collection = await getThreadsCollection()
  return (await collection.findOne({
    _id: new ObjectId(threadId),
    workspaceId,
    ownerId,
  })) as Thread | null
}

export async function listThreads(
  ownerId: string,
  workspaceId: string
): Promise<ThreadDto[]> {
  await assertWorkspaceOwner(ownerId, workspaceId)
  const collection = await getThreadsCollection()
  const threads = await collection
    .find({ workspaceId, ownerId })
    .sort({ updatedAt: -1 })
    .toArray()
  return threads.map((thread) => toThreadDto(thread as Thread))
}

export async function createThread(
  ownerId: string,
  workspaceId: string
): Promise<ThreadDto> {
  await assertWorkspaceOwner(ownerId, workspaceId)
  const collection = await getThreadsCollection()
  const now = new Date()
  const doc = {
    workspaceId,
    ownerId,
    title: null,
    status: "regular" as const,
    createdAt: now,
    updatedAt: now,
  }
  const result = await collection.insertOne(doc)
  return toThreadDto({ _id: result.insertedId, ...doc })
}

export async function getThread(
  ownerId: string,
  workspaceId: string,
  threadId: string
): Promise<ThreadDto | null> {
  await assertWorkspaceOwner(ownerId, workspaceId)
  const thread = await getOwnedThread(ownerId, workspaceId, threadId)
  return thread ? toThreadDto(thread) : null
}

export async function updateThread(
  ownerId: string,
  workspaceId: string,
  threadId: string,
  input: { title?: string | null; status?: ThreadStatus }
): Promise<ThreadDto | null> {
  await assertWorkspaceOwner(ownerId, workspaceId)
  if (!ObjectId.isValid(threadId)) {
    return null
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() }
  if (input.title !== undefined) {
    patch.title = input.title
  }
  if (input.status !== undefined) {
    patch.status = input.status
  }

  const collection = await getThreadsCollection()
  const result = await collection.findOneAndUpdate(
    {
      _id: new ObjectId(threadId),
      workspaceId,
      ownerId,
    },
    { $set: patch },
    { returnDocument: "after" }
  )

  return result ? toThreadDto(result as Thread) : null
}

export async function deleteThread(
  ownerId: string,
  workspaceId: string,
  threadId: string
): Promise<boolean> {
  await assertWorkspaceOwner(ownerId, workspaceId)
  if (!ObjectId.isValid(threadId)) {
    return false
  }

  const threads = await getThreadsCollection()
  const result = await threads.deleteOne({
    _id: new ObjectId(threadId),
    workspaceId,
    ownerId,
  })

  if (result.deletedCount === 0) {
    return false
  }

  const messages = await getChatMessagesCollection()
  await messages.deleteMany({ threadId, workspaceId, ownerId })
  return true
}

export async function listThreadMessages(
  ownerId: string,
  workspaceId: string,
  threadId: string
): Promise<ChatMessageDto[] | null> {
  await assertWorkspaceOwner(ownerId, workspaceId)
  const thread = await getOwnedThread(ownerId, workspaceId, threadId)
  if (!thread) {
    return null
  }

  const collection = await getChatMessagesCollection()
  const rows = await collection
    .find({ threadId, workspaceId, ownerId })
    .sort({ createdAt: 1 })
    .toArray()

  return rows.map((row) => ({
    id: row.messageId,
    threadId: row.threadId,
    parentId: row.parentId,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  }))
}

export async function appendThreadMessage(
  ownerId: string,
  workspaceId: string,
  threadId: string,
  input: {
    messageId: string
    parentId: string | null
    message: Record<string, unknown>
  }
): Promise<ChatMessageDto | null> {
  await assertWorkspaceOwner(ownerId, workspaceId)
  const thread = await getOwnedThread(ownerId, workspaceId, threadId)
  if (!thread) {
    return null
  }

  const now = new Date()
  const messages = await getChatMessagesCollection()
  await messages.updateOne(
    { threadId, messageId: input.messageId },
    {
      $set: {
        threadId,
        workspaceId,
        ownerId,
        messageId: input.messageId,
        parentId: input.parentId,
        message: input.message,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  )

  const threads = await getThreadsCollection()
  await threads.updateOne(
    { _id: thread._id },
    { $set: { updatedAt: now } }
  )

  return {
    id: input.messageId,
    threadId,
    parentId: input.parentId,
    message: input.message,
    createdAt: now.toISOString(),
  }
}

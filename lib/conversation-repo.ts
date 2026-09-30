/**
 * Conversations and messages repository.
 */

import { query, queryOne, execute } from "@/lib/db"
import { generateUUID } from "@/lib/db"

export interface ConversationRow {
  id: string
  user_id: string
  project_id: string | null
  title: string
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export interface MessageRow {
  id: string
  conversation_id: string
  user_id: string | null
  role: string
  content: string
  tokens: number
  created_at: string
}

export async function createConversation(
  userId: string,
  title = "New Chat",
  projectId: string | null = null
): Promise<string> {
  const id = generateUUID()
  await execute(
    `INSERT INTO conversations (id, user_id, title, project_id) VALUES (?, ?, ?, ?)`,
    [id, userId, title, projectId]
  )
  return id
}

export async function listConversations(userId: string): Promise<ConversationRow[]> {
  return listConversationsPaged(userId, {})
}

export async function listConversationsPaged(
  userId: string,
  opts: { limit?: number; offset?: number; projectId?: string; q?: string } = {}
): Promise<ConversationRow[]> {
  const limit = Number.isFinite(opts.limit) ? Math.max(1, Math.min(200, Number(opts.limit))) : 50
  const offset = Number.isFinite(opts.offset) ? Math.max(0, Number(opts.offset)) : 0
  const projectId = typeof opts.projectId === "string" && opts.projectId.length > 0 ? opts.projectId : null
  const q = typeof opts.q === "string" ? opts.q.trim() : ""
  const hasQuery = q.length > 0

  const where: string[] = ["user_id = ?"]
  const params: (string | number | boolean | null)[] = [userId]
  if (projectId) {
    where.push("project_id = ?")
    params.push(projectId)
  }
  if (hasQuery) {
    where.push("title LIKE ?")
    params.push(`%${q}%`)
  }

  return query<ConversationRow>(
    `SELECT * FROM conversations
     WHERE ${where.join(" AND ")}
     ORDER BY is_pinned DESC, updated_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )
}

export async function getConversation(
  conversationId: string,
  userId: string
): Promise<ConversationRow | null> {
  return queryOne<ConversationRow>(
    "SELECT * FROM conversations WHERE id = ? AND user_id = ?",
    [conversationId, userId]
  )
}

export async function updateConversation(
  conversationId: string,
  userId: string,
  updates: { title?: string; is_pinned?: boolean }
): Promise<void> {
  const set: string[] = []
  const values: (string | number | boolean)[] = []
  if (updates.title !== undefined) {
    set.push("title = ?")
    values.push(updates.title)
  }
  if (updates.is_pinned !== undefined) {
    set.push("is_pinned = ?")
    values.push(updates.is_pinned)
  }
  if (set.length === 0) return
  values.push(conversationId, userId)
  await execute(
    `UPDATE conversations SET ${set.join(", ")}, updated_at = NOW() WHERE id = ? AND user_id = ?`,
    values
  )
}

export async function deleteConversation(conversationId: string, userId: string): Promise<void> {
  await execute("DELETE FROM conversations WHERE id = ? AND user_id = ?", [
    conversationId,
    userId,
  ])
}

export async function addMessage(params: {
  conversation_id: string
  user_id: string | null
  role: "user" | "assistant" | "system"
  content: string
  tokens?: number
}): Promise<string> {
  const id = generateUUID()
  await execute(
    `INSERT INTO messages (id, conversation_id, user_id, role, content, tokens)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      params.conversation_id,
      params.user_id,
      params.role,
      params.content,
      params.tokens ?? 0,
    ]
  )
  await execute(
    "UPDATE conversations SET updated_at = NOW() WHERE id = ?",
    [params.conversation_id]
  )
  return id
}

export async function listMessages(conversationId: string): Promise<MessageRow[]> {
  return query<MessageRow>(
    "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
    [conversationId]
  )
}

export async function getMessage(messageId: string): Promise<MessageRow | null> {
  return queryOne<MessageRow>("SELECT * FROM messages WHERE id = ?", [messageId])
}

export async function updateMessage(
  messageId: string,
  updates: { content?: string }
): Promise<void> {
  if (updates.content !== undefined) {
    await execute("UPDATE messages SET content = ? WHERE id = ?", [updates.content, messageId])
  }
}

export async function deleteMessage(messageId: string): Promise<void> {
  await execute("DELETE FROM messages WHERE id = ?", [messageId])
}

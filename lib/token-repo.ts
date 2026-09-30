/**
 * Password reset and email verification token storage.
 */

import { queryOne, execute } from "@/lib/db"
import { generateUUID } from "@/lib/db"
import crypto from "crypto"

const TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hour

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex")
  const tokenHash = hashToken(token)
  const id = generateUUID()
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS)
  await execute(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
    [id, userId, tokenHash, expiresAt]
  )
  return token
}

export async function consumePasswordResetToken(
  token: string
): Promise<{ userId: string } | null> {
  const tokenHash = hashToken(token)
  const row = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM password_reset_tokens
     WHERE token_hash = ? AND expires_at > NOW() AND used_at IS NULL`,
    [tokenHash]
  )
  if (!row) return null
  await execute(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = ?`,
    [tokenHash]
  )
  return { userId: row.user_id }
}

export async function createEmailVerificationToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex")
  const tokenHash = hashToken(token)
  const id = generateUUID()
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS)
  await execute(
    `INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
    [id, userId, tokenHash, expiresAt]
  )
  return token
}

export async function consumeEmailVerificationToken(
  token: string
): Promise<{ userId: string } | null> {
  const tokenHash = hashToken(token)
  const row = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM email_verification_tokens
     WHERE token_hash = ? AND expires_at > NOW() AND used_at IS NULL`,
    [tokenHash]
  )
  if (!row) return null
  await execute(
    `UPDATE email_verification_tokens SET used_at = NOW() WHERE token_hash = ?`,
    [tokenHash]
  )
  return { userId: row.user_id }
}

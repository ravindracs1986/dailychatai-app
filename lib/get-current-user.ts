/**
 * Get current user from request (Authorization: Bearer <access_token>).
 * Returns null if no token or invalid. Use in API routes that require auth.
 */

import { NextRequest } from "next/server"
import { getBearerToken, verifyAccessToken } from "@/lib/auth"
import { getSafeUser, SafeUser } from "@/lib/user-repo"

export async function getCurrentUser(req: NextRequest): Promise<SafeUser | null> {
  const token = getBearerToken(req.headers.get("authorization"))
  if (!token) return null
  const payload = verifyAccessToken(token)
  if (!payload) return null
  const user = await getSafeUser(payload.userId)
  return user
}

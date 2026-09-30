/**
 * JWT and bcrypt authentication helpers.
 * Access token: short-lived. Refresh token: long-lived, stored client-side or in DB for revocation.
 */

import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const BCRYPT_ROUNDS = 12
const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || "change-me-access"
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || "change-me-refresh"
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "15m"
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d"

export interface TokenPayload {
  userId: string
  email: string
  type: "access" | "refresh"
}

/**
 * Hash password with bcrypt (12 rounds).
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * Compare plain password with hash.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

/**
 * Sign access token (short-lived).
 */
export function signAccessToken(payload: Omit<TokenPayload, "type">): string {
  return jwt.sign(
    { ...payload, type: "access" },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  )
}

/**
 * Sign refresh token (long-lived).
 */
export function signRefreshToken(payload: Omit<TokenPayload, "type">): string {
  return jwt.sign(
    { ...payload, type: "refresh" },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  )
}

/**
 * Verify access token and return payload.
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload
    if (decoded.type !== "access") return null
    return decoded
  } catch {
    return null
  }
}

/**
 * Verify refresh token and return payload.
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload
    if (decoded.type !== "refresh") return null
    return decoded
  } catch {
    return null
  }
}

/**
 * Extract Bearer token from Authorization header.
 */
export function getBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null
  return authHeader.slice(7).trim() || null
}

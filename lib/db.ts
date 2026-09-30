/**
 * MariaDB connection pool for the AI Chat application.
 * Uses mysql2/promise. When DATABASE_URL is not set, all DB operations are no-ops (app runs in legacy mode).
 */

import mysql from "mysql2/promise"
import { getEnv } from "@/lib/crypto"

const DATABASE_URL = getEnv("DATABASE_URL")

export interface PoolConnection extends mysql.PoolConnection {}

let pool: mysql.Pool | null = null

/**
 * Get the database pool. Returns null if DATABASE_URL is not configured (legacy mode).
 */
export function getPool(): mysql.Pool | null {
  if (!DATABASE_URL) return null
  if (!pool) {
    pool = mysql.createPool({
      uri: DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    })
  }
  return pool
}

/**
 * Execute a query. Returns empty result when DB is not configured.
 */
export async function query<T = unknown>(
  sql: string,
  params: (string | number | boolean | null | Date)[] = []
): Promise<T[]> {
  const p = getPool()
  if (!p) return []
  const [rows] = await p.execute(sql, params)
  return (rows as T[]) || []
}

/**
 * Execute a query and return the first row or null.
 */
export async function queryOne<T = unknown>(
  sql: string,
  params: (string | number | boolean | null | Date)[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows.length > 0 ? rows[0] : null
}

/**
 * Execute an insert/update/delete and return result.
 */
export async function execute(
  sql: string,
  params: (string | number | boolean | null | Date)[] = []
): Promise<{ affectedRows: number; insertId: number }> {
  const p = getPool()
  if (!p) return { affectedRows: 0, insertId: 0 }
  const [result] = await p.execute(sql, params)
  const r = result as mysql.ResultSetHeader
  return { affectedRows: r.affectedRows ?? 0, insertId: r.insertId ?? 0 }
}

/**
 * Check if database is configured and reachable.
 */
export async function isDatabaseConfigured(): Promise<boolean> {
  if (!DATABASE_URL) return false
  try {
    const p = getPool()
    if (!p) return false
    await p.execute("SELECT 1")
    return true
  } catch {
    return false
  }
}

/**
 * Get database status for clearer error messages.
 * Returns "ok" | "missing" (no DATABASE_URL) | "unreachable" (connection failed).
 */
export async function getDatabaseStatus(): Promise<"ok" | "missing" | "unreachable"> {
  if (!DATABASE_URL || DATABASE_URL.trim() === "") return "missing"
  try {
    const p = getPool()
    if (!p) return "missing"
    await p.execute("SELECT 1")
    return "ok"
  } catch {
    return "unreachable"
  }
}

/**
 * Generate a UUID (for MariaDB compatibility where UUID() may not exist in older versions).
 */
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

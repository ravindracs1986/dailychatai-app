/**
 * User repository: CRUD and lookups for users table.
 */

import { query, queryOne, execute } from "@/lib/db"
import { generateUUID } from "@/lib/db"
import { PLAN_IDS } from "@/lib/plans"

export interface UserRow {
  id: string
  username: string
  email: string
  name: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  password_hash: string
  profile_pic_url: string | null
  plan_id: string | null
  role: "user" | "admin"
  usage_limit: number
  usage_today: number
  is_active: boolean
  email_verified_at: string | null
  created_at: string
  updated_at: string
}

export interface SafeUser {
  id: string
  username: string
  email: string
  name: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  profile_pic_url: string | null
  plan_id: string | null
  role: "user" | "admin"
  usage_limit: number
  usage_today: number
  email_verified_at: string | null
}

export function toSafeUser(row: UserRow): SafeUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    name: row.name,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    country: row.country,
    profile_pic_url: row.profile_pic_url,
    plan_id: row.plan_id,
    role: row.role,
    usage_limit: row.usage_limit,
    usage_today: row.usage_today,
    email_verified_at: row.email_verified_at,
  }
}

export async function findUserById(id: string): Promise<UserRow | null> {
  return queryOne<UserRow>("SELECT * FROM users WHERE id = ?", [id])
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  return queryOne<UserRow>("SELECT * FROM users WHERE email = ?", [email])
}

export async function findUserByUsername(username: string): Promise<UserRow | null> {
  return queryOne<UserRow>("SELECT * FROM users WHERE username = ?", [username])
}

export async function createUser(params: {
  username: string
  email: string
  password_hash: string
  profile_pic_url?: string | null
}): Promise<string> {
  const id = generateUUID()
  const planId = PLAN_IDS.FREE
  await execute(
    `INSERT INTO users (id, username, email, password_hash, profile_pic_url, plan_id, usage_limit, role)
     VALUES (?, ?, ?, ?, ?, ?, 10, 'user')`,
    [
      id,
      params.username,
      params.email,
      params.password_hash,
      params.profile_pic_url ?? null,
      planId,
    ]
  )
  return id
}

export async function updateUser(
  userId: string,
  updates: {
    username?: string
    name?: string | null
    phone?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    country?: string | null
    profile_pic_url?: string | null
    password_hash?: string
    email_verified_at?: string | null
  }
): Promise<void> {
  const set: string[] = []
  const values: (string | null)[] = []
  if (updates.username !== undefined) {
    set.push("username = ?")
    values.push(updates.username)
  }
  if (updates.name !== undefined) {
    set.push("name = ?")
    values.push(updates.name)
  }
  if (updates.phone !== undefined) {
    set.push("phone = ?")
    values.push(updates.phone)
  }
  if (updates.address !== undefined) {
    set.push("address = ?")
    values.push(updates.address)
  }
  if (updates.city !== undefined) {
    set.push("city = ?")
    values.push(updates.city)
  }
  if (updates.state !== undefined) {
    set.push("state = ?")
    values.push(updates.state)
  }
  if (updates.country !== undefined) {
    set.push("country = ?")
    values.push(updates.country)
  }
  if (updates.profile_pic_url !== undefined) {
    set.push("profile_pic_url = ?")
    values.push(updates.profile_pic_url)
  }
  if (updates.password_hash !== undefined) {
    set.push("password_hash = ?")
    values.push(updates.password_hash)
  }
  if (updates.email_verified_at !== undefined) {
    set.push("email_verified_at = ?")
    values.push(updates.email_verified_at)
  }
  if (set.length === 0) return
  values.push(userId)
  await execute(`UPDATE users SET ${set.join(", ")} WHERE id = ?`, values)
}

export async function getSafeUser(userId: string): Promise<SafeUser | null> {
  const row = await findUserById(userId)
  return row ? toSafeUser(row) : null
}

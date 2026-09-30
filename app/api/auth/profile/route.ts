import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/get-current-user"
import { updateUser, findUserById, findUserByUsername } from "@/lib/user-repo"
import { hashPassword, verifyPassword } from "@/lib/auth"
import { isDatabaseConfigured } from "@/lib/db"
import { sendTemplateEmail } from "@/lib/email"

const UpdateProfileSchema = z.object({
  username: z.string().min(2).max(255).trim().optional(),
  name: z.string().max(100).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  profile_pic_url: z.string().url().nullable().optional(),
  current_password: z.string().optional(),
  new_password: z.string().min(8).max(128).optional(),
}).refine(
  (data) => !data.new_password || data.current_password,
  { message: "Current password required to set new password", path: ["current_password"] }
)

export async function PATCH(request: NextRequest) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Authentication not configured" }, { status: 503 })
  }

  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = UpdateProfileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { username, name, phone, address, city, state, country, profile_pic_url, current_password, new_password } = parsed.data

    const updates: Parameters<typeof updateUser>[1] = {}
    if (username !== undefined) {
      const existing = await findUserByUsername(username)
      if (existing && existing.id !== user.id) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 })
      }
      updates.username = username
    }
    if (name !== undefined) updates.name = name
    if (phone !== undefined) updates.phone = phone
    if (address !== undefined) updates.address = address
    if (city !== undefined) updates.city = city
    if (state !== undefined) updates.state = state
    if (country !== undefined) updates.country = country
    if (profile_pic_url !== undefined) updates.profile_pic_url = profile_pic_url
    if (new_password && current_password) {
      const u = await findUserById(user.id)
      if (!u || !(await verifyPassword(current_password, u.password_hash))) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
      }
      updates.password_hash = await hashPassword(new_password)
    }

    if (Object.keys(updates).length > 0) {
      await updateUser(user.id, updates)
      sendTemplateEmail(user.email, "profile_update", {
        username: updates.username || user.username,
        changes: Object.keys(updates).join(", "),
      }).catch(() => {})
    }

    const { getSafeUser } = await import("@/lib/user-repo")
    const updated = await getSafeUser(user.id)
    return NextResponse.json({ user: updated })
  } catch (e) {
    console.error("[auth/profile]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 }
    )
  }
}

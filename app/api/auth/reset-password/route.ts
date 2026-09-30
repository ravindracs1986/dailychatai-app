import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { hashPassword } from "@/lib/auth"
import { consumePasswordResetToken } from "@/lib/token-repo"
import { execute } from "@/lib/db"
import { isDatabaseConfigured } from "@/lib/db"

const ResetSchema = z.object({
  token: z.string().min(1),
  new_password: z.string().min(8).max(128),
})

export async function POST(request: NextRequest) {
  const key = getRateLimitKey(request.headers, "auth")
  const { allowed } = rateLimit(key, { windowMs: 60_000, max: 5 })
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Authentication not configured" }, { status: 503 })
  }

  try {
    const body = await request.json()
    const parsed = ResetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }
    const { token, new_password } = parsed.data

    const result = await consumePasswordResetToken(token)
    if (!result) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 })
    }

    const password_hash = await hashPassword(new_password)
    await execute("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?", [
      password_hash,
      result.userId,
    ])

    return NextResponse.json({ message: "Password reset successfully" })
  } catch (e) {
    console.error("[auth/reset-password]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Reset failed" },
      { status: 500 }
    )
  }
}

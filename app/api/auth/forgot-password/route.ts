import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { findUserByEmail } from "@/lib/user-repo"
import { createPasswordResetToken } from "@/lib/token-repo"
import { sendPasswordResetEmail, isEmailConfigured } from "@/lib/email"
import { isDatabaseConfigured } from "@/lib/db"

const ForgotSchema = z.object({ email: z.string().email() })

export async function POST(request: NextRequest) {
  const key = getRateLimitKey(request.headers, "auth")
  const { allowed } = rateLimit(key, { windowMs: 60_000, max: 3 })
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Authentication not configured" }, { status: 503 })
  }

  try {
    const body = await request.json()
    const parsed = ForgotSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }
    const { email } = parsed.data

    const user = await findUserByEmail(email)
    if (!user) {
      return NextResponse.json({ message: "If that email exists, we sent a reset link" })
    }

    if (!isEmailConfigured()) {
      return NextResponse.json({
        message: "Email not configured. In development you can use the reset token from server logs.",
        devToken: process.env.NODE_ENV === "development" ? await createPasswordResetToken(user.id) : undefined,
      })
    }

    const token = await createPasswordResetToken(user.id)
    await sendPasswordResetEmail(user.email, token)

    return NextResponse.json({ message: "If that email exists, we sent a reset link" })
  } catch (e) {
    console.error("[auth/forgot-password]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Request failed" },
      { status: 500 }
    )
  }
}

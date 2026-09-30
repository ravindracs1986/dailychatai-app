import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { findUserByEmail } from "@/lib/user-repo"
import { createEmailVerificationToken } from "@/lib/token-repo"
import { sendVerificationEmail, isEmailConfigured } from "@/lib/email"
import { isDatabaseConfigured } from "@/lib/db"

const ResendSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  const key = getRateLimitKey(request.headers, "auth-resend")
  const { allowed } = rateLimit(key, { windowMs: 60 * 60 * 1000, max: 5 }) // 5 per hour
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  try {
    const body = await request.json()
    const parsed = ResendSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }

    const { email } = parsed.data
    const user = await findUserByEmail(email)

    // Only send if user exists and is NOT verified
    if (user && !user.email_verified_at && isEmailConfigured()) {
      const token = await createEmailVerificationToken(user.id)
      await sendVerificationEmail(email, token, user.username)
    }

    // Always return success to avoid user enumeration
    return NextResponse.json({ message: "If your account exists and is unverified, a verification email has been sent." })
  } catch (e) {
    console.error("[auth/resend-verification]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { verifyPassword, signAccessToken, signRefreshToken } from "@/lib/auth"
import { findUserByEmail, toSafeUser } from "@/lib/user-repo"
import { getDatabaseStatus } from "@/lib/db"

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const key = getRateLimitKey(request.headers, "auth")
  const { allowed } = rateLimit(key, { windowMs: 60_000, max: 10 })
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  const dbStatus = await getDatabaseStatus()
  if (dbStatus !== "ok") {
    const message =
      dbStatus === "missing"
        ? "Database not configured. Add DATABASE_URL to .env.dev (or .env.prod) and run the migrations."
        : "Database connection failed. Check that MariaDB is running, DATABASE_URL is correct, and migrations have been run (see README)."
    return NextResponse.json({ error: message }, { status: 503 })
  }

  try {
    const body = await request.json()
    const parsed = LoginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 400 })
    }
    const { email, password } = parsed.data

    const user = await findUserByEmail(email)
    if (!user || !user.is_active) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    if (!user.email_verified_at) {
      return NextResponse.json({ 
        error: "Email not verified. Please check your inbox.",
        code: "EMAIL_NOT_VERIFIED"
      }, { status: 403 })
    }

    const accessToken = signAccessToken({ userId: user.id, email: user.email })
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email })

    return NextResponse.json({
      user: toSafeUser(user),
      accessToken,
      refreshToken,
      expiresIn: 900,
    })
  } catch (e) {
    console.error("[auth/login]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Login failed" },
      { status: 500 }
    )
  }
}

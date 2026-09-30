import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit"
import { hashPassword, signAccessToken, signRefreshToken } from "@/lib/auth"
import { createUser, findUserByEmail, findUserByUsername } from "@/lib/user-repo"
import { getDatabaseStatus } from "@/lib/db"
import { sendWelcomeEmail, sendVerificationEmail, isEmailConfigured } from "@/lib/email"
import { createEmailVerificationToken } from "@/lib/token-repo"

const RegisterSchema = z.object({
  username: z.string().min(2).max(255).trim(),
  email: z.string().email().max(100),
  password: z.string().min(8).max(128),
  profile_pic_url: z.string().url().optional().nullable(),
})

export async function POST(request: NextRequest) {
  const key = getRateLimitKey(request.headers, "auth")
  const { allowed } = rateLimit(key, { windowMs: 60_000, max: 5 })
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  const dbStatus = await getDatabaseStatus()
  if (dbStatus !== "ok") {
    const message =
      dbStatus === "missing"
        ? "Database not configured. Add DATABASE_URL to .env.dev (or .env.prod) and run the migrations."
        : "Database connection failed. Check that MariaDB is running, DATABASE_URL is correct, and migrations have been run (see README)."
    return NextResponse.json({ error: message, code: dbStatus }, { status: 503 })
  }

  try {
    const body = await request.json()
    const parsed = RegisterSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { username, email, password, profile_pic_url } = parsed.data

    const existingEmail = await findUserByEmail(email)
    if (existingEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }
    const existingUsername = await findUserByUsername(username)
    if (existingUsername) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 })
    }

    const password_hash = await hashPassword(password)
    const userId = await createUser({
      username,
      email,
      password_hash,
      profile_pic_url: profile_pic_url ?? null,
    })

    const accessToken = signAccessToken({ userId, email })
    const refreshToken = signRefreshToken({ userId, email })

    if (isEmailConfigured()) {
      // Fire and forget email
      sendWelcomeEmail(email, username).catch(e => console.error("Failed to send welcome email:", e))
      
      // Send verification email
      createEmailVerificationToken(userId)
        .then(token => sendVerificationEmail(email, token, username))
        .catch(e => console.error("Failed to send verification email:", e))
    }

    return NextResponse.json({
      user: {
        id: userId,
        username,
        email,
        name: null,
        phone: null,
        address: null,
        city: null,
        state: null,
        country: null,
        profile_pic_url: profile_pic_url ?? null,
        plan_id: "00000000-0000-0000-0000-000000000001",
        role: "user",
        usage_limit: 10,
        usage_today: 0,
        email_verified_at: null,
      },
      accessToken,
      refreshToken,
      expiresIn: 900,
    })
  } catch (e) {
    console.error("[auth/register]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Registration failed" },
      { status: 500 }
    )
  }
}

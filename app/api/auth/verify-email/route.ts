import { NextRequest, NextResponse } from "next/server"
import { consumeEmailVerificationToken } from "@/lib/token-repo"
import { updateUser } from "@/lib/user-repo"
import { isDatabaseConfigured } from "@/lib/db"

export async function GET(request: NextRequest) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Authentication not configured" }, { status: 503 })
  }

  const token = request.nextUrl.searchParams.get("token")
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", request.url))
  }

  try {
    const result = await consumeEmailVerificationToken(token)
    if (!result) {
      return NextResponse.redirect(new URL("/login?error=invalid_token", request.url))
    }
    await updateUser(result.userId, {
      email_verified_at: new Date().toISOString().slice(0, 19).replace("T", " "),
    })
    return NextResponse.redirect(new URL("/login?verified=1", request.url))
  } catch (e) {
    console.error("[auth/verify-email]", e)
    return NextResponse.redirect(new URL("/login?error=verify_failed", request.url))
  }
}

import { NextRequest, NextResponse } from "next/server"
import { getBearerToken, verifyRefreshToken, signAccessToken, signRefreshToken } from "@/lib/auth"
import { getSafeUser } from "@/lib/user-repo"
import { isDatabaseConfigured } from "@/lib/db"

export async function POST(request: NextRequest) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Authentication not configured" }, { status: 503 })
  }

  const token = getBearerToken(request.headers.get("authorization"))
  if (!token) {
    return NextResponse.json({ error: "Missing refresh token" }, { status: 401 })
  }

  const payload = verifyRefreshToken(token)
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired refresh token" }, { status: 401 })
  }

  const user = await getSafeUser(payload.userId)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 })
  }

  const accessToken = signAccessToken({ userId: user.id, email: user.email })
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email })

  return NextResponse.json({
    user,
    accessToken,
    refreshToken,
    expiresIn: 900,
  })
}

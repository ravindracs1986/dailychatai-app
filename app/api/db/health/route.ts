import { NextRequest, NextResponse } from "next/server"
import { isDatabaseConfigured, queryOne } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"

export async function GET(request: NextRequest) {
  const configured = await isDatabaseConfigured()
  if (!configured) {
    return NextResponse.json({ configured: false }, { status: 200 })
  }

  const user = await getCurrentUser(request)
  const meta = await queryOne<{ db: string; version: string }>("SELECT DATABASE() AS db, VERSION() AS version")
  const convCount = user
    ? await queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM conversations WHERE user_id = ?", [user.id])
    : null

  return NextResponse.json(
    {
      configured: true,
      db: meta?.db ?? null,
      version: meta?.version ?? null,
      userId: user?.id ?? null,
      conversationsForUser: convCount?.n ?? null,
    },
    { status: 200 }
  )
}


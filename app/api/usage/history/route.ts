import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { query, isDatabaseConfigured } from "@/lib/db"

export async function GET(request: NextRequest) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Fetch daily usage history (last 30 days)
    const dailyUsage = await query(
      `SELECT date, message_count, tokens_used 
       FROM daily_usage 
       WHERE user_id = ? 
       ORDER BY date DESC 
       LIMIT 30`,
      [user.id]
    )

    // Fetch recent conversations (last 20)
    const conversations = await query(
      `SELECT id, title, is_pinned, created_at, updated_at 
       FROM conversations 
       WHERE user_id = ? 
       ORDER BY updated_at DESC 
       LIMIT 20`,
      [user.id]
    )

    return NextResponse.json({ 
      dailyUsage,
      conversations
    })
  } catch (error) {
    console.error("Usage history error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { listConversationsPaged, createConversation } from "@/lib/conversation-repo"
import { isDatabaseConfigured } from "@/lib/db"
import { z } from "zod"

const CreateSchema = z.object({ title: z.string().max(200).optional() })

export async function GET(request: NextRequest) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 })
  }
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get("limit") || "50")
  const offset = Number(searchParams.get("offset") || "0")
  const q = searchParams.get("q") || ""
  const conversations = await listConversationsPaged(user.id, { limit, offset, q })
  return NextResponse.json({ conversations, limit, offset, q })
}

export async function POST(request: NextRequest) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 })
  }
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const parsed = CreateSchema.safeParse(body)
    const title = parsed.success && parsed.data.title ? parsed.data.title : "New Chat"
    const id = await createConversation(user.id, title)
    return NextResponse.json({ conversation: { id, title, user_id: user.id } })
  } catch (e) {
    console.error("[conversations POST]", e)
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { getConversation, listMessages } from "@/lib/conversation-repo"
import { isDatabaseConfigured } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 })
  }
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: conversationId } = await params
  const conv = await getConversation(conversationId, user.id)
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const messages = await listMessages(conversationId)
  return NextResponse.json({ messages })
}

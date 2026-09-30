import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import {
  getConversation,
  updateConversation,
  deleteConversation,
} from "@/lib/conversation-repo"
import { isDatabaseConfigured } from "@/lib/db"
import { z } from "zod"

const UpdateSchema = z.object({
  title: z.string().max(200).optional(),
  is_pinned: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 })
  }
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const conv = await getConversation(id, user.id)
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ conversation: conv })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 })
  }
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const conv = await getConversation(id, user.id)
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 })

  try {
    const body = await request.json().catch(() => ({}))
    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 })
    }
    await updateConversation(id, user.id, parsed.data)
    const updated = await getConversation(id, user.id)
    return NextResponse.json({ conversation: updated })
  } catch (e) {
    console.error("[conversations PATCH]", e)
    return NextResponse.json({ error: "Update failed" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 })
  }
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const conv = await getConversation(id, user.id)
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await deleteConversation(id, user.id)
  return NextResponse.json({ ok: true })
}

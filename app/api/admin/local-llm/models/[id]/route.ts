import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { execute, isDatabaseConfigured } from "@/lib/db"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  const currentUser = await getCurrentUser(request)
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const is_active = body?.is_active

    if (typeof is_active !== "boolean") {
      return NextResponse.json({ error: "is_active must be boolean" }, { status: 400 })
    }

    await execute("UPDATE local_models SET is_active = ? WHERE id = ?", [is_active ? 1 : 0, id])
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[admin][local-llm] update model", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


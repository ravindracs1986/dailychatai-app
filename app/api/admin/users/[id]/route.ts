import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { isDatabaseConfigured, execute } from "@/lib/db"

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
    const body = await request.json()
    const { role } = body

    if (role && !["user", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    if (role) {
      await execute("UPDATE users SET role = ? WHERE id = ?", [role, id])
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin update user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
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
    
    // Prevent self-deletion
    if (id === currentUser.id) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 })
    }

    await execute("DELETE FROM users WHERE id = ?", [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin delete user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

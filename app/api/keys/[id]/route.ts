
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { execute, queryOne } from "@/lib/db"

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const keyId = params.id
    
    // Verify ownership
    const key = await queryOne("SELECT id FROM api_keys WHERE id = ? AND user_id = ?", [keyId, user.id])
    
    if (!key) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 })
    }

    await execute("DELETE FROM api_keys WHERE id = ?", [keyId])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete API key:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

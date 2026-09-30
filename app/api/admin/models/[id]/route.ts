import { NextRequest, NextResponse } from "next/server"
import { execute } from "@/lib/db"

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { is_active, is_free, is_public } = await request.json()
    
    const id = decodeURIComponent(params.id)
    
    if (typeof is_active !== "undefined") {
      await execute(
        "UPDATE models SET is_active = ? WHERE id = ?",
        [is_active ? 1 : 0, id]
      )
    }

    if (typeof is_free !== "undefined") {
      await execute(
        "UPDATE models SET is_free = ? WHERE id = ?",
        [is_free ? 1 : 0, id]
      )
    }

    if (typeof is_public !== "undefined") {
      await execute(
        "UPDATE models SET is_public = ? WHERE id = ?",
        [is_public ? 1 : 0, id]
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

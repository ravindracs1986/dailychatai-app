import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { execute } from "@/lib/db"
import { isDatabaseConfigured } from "@/lib/db"

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }
  const user = await getCurrentUser(request)
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }
  try {
    const body = await request.json()
    const { is_active, config, title, description } = body
    
    await execute(
        "UPDATE payment_gateways SET is_active = ?, config = ?, title = ?, description = ? WHERE id = ?",
        [
            is_active === true || is_active === 1 ? 1 : 0, 
            config ? JSON.stringify(config) : null, 
            title ?? "", 
            description ?? "", 
            params.id
        ]
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin update gateway error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

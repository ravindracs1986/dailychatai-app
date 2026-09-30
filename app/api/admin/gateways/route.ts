import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { query } from "@/lib/db"
import { isDatabaseConfigured } from "@/lib/db"

export async function GET(request: NextRequest) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }
  const user = await getCurrentUser(request)
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }
  try {
    const gateways = await query("SELECT * FROM payment_gateways ORDER BY name ASC")
    return NextResponse.json({ gateways })
  } catch (error) {
    console.error("Admin fetch gateways error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

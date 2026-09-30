import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { execute, queryOne, isDatabaseConfigured } from "@/lib/db"

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 })
  }
  const user = await getCurrentUser(request)
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const txId = params.id
    const tx = await queryOne<any>("SELECT * FROM transactions WHERE id = ?", [txId])
    
    if (!tx) {
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }
    
    // Update Transaction Status
    await execute("UPDATE transactions SET status = 'failed' WHERE id = ?", [txId])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin reject payment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

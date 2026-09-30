import { NextResponse } from "next/server"
import { execute } from "@/lib/db"

export async function GET() {
  try {
    const sql = `ALTER TABLE models CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    
    await execute(sql)
    
    return NextResponse.json({ success: true, message: "Models table charset updated to utf8mb4" })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

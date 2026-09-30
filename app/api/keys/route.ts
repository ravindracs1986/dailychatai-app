
import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { execute, query, generateUUID } from "@/lib/db"
import crypto from "crypto"

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const keys = await query(
      "SELECT id, name, last_used_at, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC",
      [user.id]
    )
    return NextResponse.json({ keys })
  } catch (error) {
    console.error("Failed to fetch API keys:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (process.env.ALLOW_USER_API_KEYS === "false") {
      return NextResponse.json({ error: "API keys are disabled by administrator" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const name = body.name?.trim()
    
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    if (name.length > 50) {
        return NextResponse.json({ error: "Name must be less than 50 characters" }, { status: 400 })
    }

    // Limit number of keys per user
    const existing = await query("SELECT COUNT(*) as count FROM api_keys WHERE user_id = ?", [user.id])
    // @ts-ignore
    if (existing[0]?.count >= 10) {
        return NextResponse.json({ error: "Maximum limit of 10 API keys reached" }, { status: 400 })
    }

    // Generate key: sk-wing-<48 hex chars>
    const key = "sk-wing-" + crypto.randomBytes(24).toString("hex")
    // Store SHA-256 hash
    const keyHash = crypto.createHash("sha256").update(key).digest("hex")
    const id = generateUUID()

    await execute(
      "INSERT INTO api_keys (id, user_id, name, key_hash) VALUES (?, ?, ?, ?)",
      [id, user.id, name, keyHash]
    )

    return NextResponse.json({ 
      key: { 
          id, 
          name, 
          key, // Only returned once!
          created_at: new Date().toISOString()
      } 
    })
  } catch (error) {
    console.error("Failed to create API key:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

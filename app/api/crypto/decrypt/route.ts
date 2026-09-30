import { NextRequest, NextResponse } from "next/server"
import { decrypt } from "@/lib/crypto"

export async function POST(req: NextRequest) {
  const headerKey = req.headers.get("x-app-key")
  const systemKey = process.env.HEADER_APP_KEY

  if (!systemKey || headerKey !== systemKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { encrypted } = await req.json()
    if (!encrypted) {
      return NextResponse.json({ error: "Encrypted value is required" }, { status: 400 })
    }

    const decrypted = decrypt(encrypted)
    return NextResponse.json({ decrypted })
  } catch (error) {
    return NextResponse.json({ error: "Decryption failed" }, { status: 500 })
  }
}

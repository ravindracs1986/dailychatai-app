import { NextRequest, NextResponse } from "next/server"
import { encrypt } from "@/lib/crypto"

export async function POST(req: NextRequest) {
  const headerKey = req.headers.get("x-app-key")
  const systemKey = process.env.HEADER_APP_KEY

  console.log("Debug Auth:", { 
    receivedHeader: headerKey, 
    expectedSystemKey: systemKey,
    envVarExists: !!process.env.HEADER_APP_KEY
  })

  if (!systemKey || headerKey !== systemKey) {
    return NextResponse.json({ 
      error: "Unauthorized", 
      debug: { 
        received: headerKey, 
        expected: systemKey ? "***" : "undefined" // Don't leak the key in response
      } 
    }, { status: 401 })
  }

  try {
    const { value } = await req.json()
    if (!value) {
      return NextResponse.json({ error: "Value is required" }, { status: 400 })
    }

    const encrypted = encrypt(value)
    return NextResponse.json({ encrypted })
  } catch (error) {
    return NextResponse.json({ error: "Encryption failed" }, { status: 500 })
  }
}

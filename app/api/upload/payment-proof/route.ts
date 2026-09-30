import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { isDatabaseConfigured } from "@/lib/db"
import { writeFile } from "fs/promises"
import { join } from "path"
import { existsSync, mkdirSync } from "fs"

export async function POST(request: NextRequest) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 })
  }
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file || !file.size) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Create unique filename to ensure no conflicts and traceability
    // Format: proof-[userId]-[timestamp].[ext]
    const originalName = file.name || "proof.jpg"
    // Sanitize extension
    const ext = (originalName.split('.').pop() || "jpg").replace(/[^a-z0-9]/gi, '')
    const filename = `proof-${user.id}-${Date.now()}.${ext}`
    
    // Ensure directory exists
    const uploadDir = join(process.cwd(), "public", "uploads", "payment-proofs")
    if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true })
    }

    const filePath = join(uploadDir, filename)
    await writeFile(filePath, buffer)

    // Return the public URL
    const url = `/uploads/payment-proofs/${filename}`
    
    return NextResponse.json({ url })
  } catch (e) {
    console.error("[upload/payment-proof]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { v2 as cloudinary } from "cloudinary"
import { isDatabaseConfigured } from "@/lib/db"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 })
  }
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return NextResponse.json({ error: "Cloudinary not configured" }, { status: 503 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file || !file.size) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString("base64")
    const dataUri = `data:${file.type};base64,${base64}`

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader.upload(
        dataUri,
        {
          folder: "profile-pics",
          public_id: `user-${user.id}`,
          overwrite: true,
          resource_type: "image",
        },
        (err, res) => {
          if (err) reject(err)
          else resolve({ secure_url: (res as { secure_url: string }).secure_url })
        }
      )
    })

    return NextResponse.json({ url: result.secure_url })
  } catch (e) {
    console.error("[upload/profile]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    )
  }
}

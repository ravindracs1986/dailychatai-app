import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { getAllTemplates, createTemplate } from "@/lib/email-template-repo"
import { z } from "zod"

const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  subject: z.string().min(1).max(255),
  body_html: z.string().min(1),
  body_text: z.string().min(1),
  description: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const templates = await getAllTemplates()
  return NextResponse.json({ templates })
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = CreateTemplateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
    }

    await createTemplate(parsed.data)
    return NextResponse.json({ message: "Template created" })
  } catch (error: any) {
    console.error("[API] Error creating template:", error)
    return NextResponse.json({ error: error.message || "Failed to create template" }, { status: 500 })
  }
}

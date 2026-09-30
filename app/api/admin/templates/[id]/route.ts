import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { getTemplateById, updateTemplate, deleteTemplate } from "@/lib/email-template-repo"
import { z } from "zod"

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  subject: z.string().min(1).max(255).optional(),
  body_html: z.string().min(1).optional(),
  body_text: z.string().min(1).optional(),
  description: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request)
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }
  
  const { id } = await params
  const template = await getTemplateById(id)
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 })
  }

  return NextResponse.json({ template })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request)
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }
  const { id } = await params

  try {
    const body = await request.json()
    const parsed = UpdateTemplateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
    }

    await updateTemplate(id, parsed.data)
    return NextResponse.json({ message: "Template updated" })
  } catch (error: any) {
    console.error("[API] Error updating template:", error)
    return NextResponse.json({ error: error.message || "Failed to update template" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request)
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }
  const { id } = await params

  try {
    await deleteTemplate(id)
    return NextResponse.json({ message: "Template deleted" })
  } catch (error: any) {
    console.error("[API] Error deleting template:", error)
    return NextResponse.json({ error: error.message || "Failed to delete template" }, { status: 500 })
  }
}

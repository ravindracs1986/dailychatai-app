import { NextRequest, NextResponse } from "next/server"
import { deleteProject, updateProject } from "@/lib/project-repo"
import { getCurrentUser } from "@/lib/get-current-user"
import { isDatabaseConfigured } from "@/lib/db"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { name, emoji, description, isPublic } = body

    const project = await updateProject(id, user.id, {
      name,
      emoji,
      description,
      isPublic,
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 })
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error("Failed to update project:", error)
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const success = await deleteProject(id, user.id)

    if (!success) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete project:", error)
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { createProject, getUserProjects } from "@/lib/project-repo"
import { isDatabaseConfigured } from "@/lib/db"

export async function GET(request: NextRequest) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ projects: [] })
  }

  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const projects = await getUserProjects(user.id)
  return NextResponse.json({ projects })
}

export async function POST(request: NextRequest) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, emoji, description, isPublic } = body

    if (!name) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 })
    }

    const project = await createProject({
      userId: user.id,
      name,
      emoji,
      description,
      isPublic
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error("Failed to create project:", error)
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}

import { execute, query, queryOne } from "./db"
import { randomUUID } from "crypto"

export interface Project {
  id: string
  user_id: string
  name: string
  description?: string | null
  emoji?: string | null
  is_public: boolean
  created_at: Date
  updated_at: Date
}

export interface CreateProjectDTO {
  userId: string
  name: string
  description?: string
  emoji?: string
  isPublic?: boolean
}

export async function createProject(data: CreateProjectDTO): Promise<Project> {
  const id = randomUUID()
  const { userId, name, description = null, emoji = null, isPublic = false } = data

  await execute(
    `INSERT INTO projects (id, user_id, name, description, emoji, is_public)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, name, description, emoji, isPublic]
  )

  const project = await getProjectById(id)
  if (!project) throw new Error("Failed to create project")
  return project
}

export async function getProjectById(id: string): Promise<Project | null> {
  return await queryOne<Project>("SELECT * FROM projects WHERE id = ?", [id])
}

export async function getUserProjects(userId: string): Promise<Project[]> {
  return await query<Project>(
    "SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  )
}

export async function updateProject(
  id: string,
  userId: string,
  data: Partial<Omit<CreateProjectDTO, "userId">>
): Promise<Project | null> {
  const current = await getProjectById(id)
  if (!current || current.user_id !== userId) return null

  const updates: string[] = []
  const values: any[] = []

  if (data.name !== undefined) {
    updates.push("name = ?")
    values.push(data.name)
  }
  if (data.description !== undefined) {
    updates.push("description = ?")
    values.push(data.description)
  }
  if (data.emoji !== undefined) {
    updates.push("emoji = ?")
    values.push(data.emoji)
  }
  if (data.isPublic !== undefined) {
    updates.push("is_public = ?")
    values.push(data.isPublic)
  }

  if (updates.length === 0) return current

  values.push(id)
  values.push(userId)

  await execute(
    `UPDATE projects SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
    values
  )

  return await getProjectById(id)
}

export async function deleteProject(id: string, userId: string): Promise<boolean> {
  const result = await execute(
    "DELETE FROM projects WHERE id = ? AND user_id = ?",
    [id, userId]
  )
  return result.affectedRows > 0
}

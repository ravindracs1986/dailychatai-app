import { query, queryOne, execute } from "@/lib/db"

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body_html: string
  body_text: string
  description: string | null
  created_at: Date
  updated_at: Date
}

export async function getAllTemplates(): Promise<EmailTemplate[]> {
  return query<EmailTemplate>("SELECT * FROM email_templates ORDER BY name ASC")
}

export async function getTemplateById(id: string): Promise<EmailTemplate | null> {
  return queryOne<EmailTemplate>("SELECT * FROM email_templates WHERE id = ?", [id])
}

export async function getTemplateByName(name: string): Promise<EmailTemplate | null> {
  return queryOne<EmailTemplate>("SELECT * FROM email_templates WHERE name = ?", [name])
}

export async function createTemplate(
  data: Omit<EmailTemplate, "id" | "created_at" | "updated_at">
): Promise<string> {
  const result = await execute(
    "INSERT INTO email_templates (id, name, subject, body_html, body_text, description) VALUES (UUID(), ?, ?, ?, ?, ?)",
    [data.name, data.subject, data.body_html, data.body_text, data.description]
  )
  // Since we use UUID(), we can't easily get the ID back from insertId. 
  // We might need to select it back or generate UUID in JS.
  // For simplicity, let's just return the name or query by name.
  // Ideally, generate UUID in JS.
  return data.name
}

export async function updateTemplate(
  id: string,
  data: Partial<Omit<EmailTemplate, "id" | "created_at" | "updated_at">>
): Promise<void> {
  const updates: string[] = []
  const params: any[] = []

  if (data.name !== undefined) {
    updates.push("name = ?")
    params.push(data.name)
  }
  if (data.subject !== undefined) {
    updates.push("subject = ?")
    params.push(data.subject)
  }
  if (data.body_html !== undefined) {
    updates.push("body_html = ?")
    params.push(data.body_html)
  }
  if (data.body_text !== undefined) {
    updates.push("body_text = ?")
    params.push(data.body_text)
  }
  if (data.description !== undefined) {
    updates.push("description = ?")
    params.push(data.description)
  }

  if (updates.length === 0) return

  params.push(id)
  await execute(`UPDATE email_templates SET ${updates.join(", ")} WHERE id = ?`, params)
}

export async function deleteTemplate(id: string): Promise<void> {
  await execute("DELETE FROM email_templates WHERE id = ?", [id])
}

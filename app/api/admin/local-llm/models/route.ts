import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { query } from "@/lib/db"
import { isLocalLlmActive } from "@/config"

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser(request)
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const active = isLocalLlmActive()
  if (!active) {
    return NextResponse.json({ active: false, models: [] }, { status: 200 })
  }

  try {
    const rows = await query<any>("SELECT * FROM local_models ORDER BY name ASC")
    const models = rows.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider || "local",
      context_length: Number(m.context_length || 0),
      pricing: { prompt: "0", completion: "0" },
      architecture_modality: m.architecture_modality || "text",
      is_active: !!m.is_active,
    }))
    return NextResponse.json({ active: true, models }, { status: 200 })
  } catch (e) {
    console.error("[admin][local-llm] fetch models (db)", e)
    return NextResponse.json({ active: true, models: [], error: "Failed to fetch local models" }, { status: 200 })
  }
}


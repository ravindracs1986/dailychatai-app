import { NextResponse, NextRequest } from "next/server"
import { query } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { isLocalLlmActive } from "@/config"
import { isLocalLlmEnabledForUser } from "@/lib/usage"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    const useLocal = !!user && isLocalLlmActive() && (await isLocalLlmEnabledForUser(user.id))
    if (useLocal) {
      const rows = await query<any>("SELECT * FROM local_models WHERE is_active = 1 ORDER BY name ASC")
      const freeModels = rows.map((m) => ({
        id: m.id,
        name: m.name,
        description: "",
        context_length: Number(m.context_length || 0) || 8192,
        pricing: { prompt: "0", completion: "0" },
        architecture: { modality: m.architecture_modality || "text" },
        architecture_modality: m.architecture_modality || "text",
      }))
      return NextResponse.json({
        models: freeModels,
        total: freeModels.length,
        lastUpdated: new Date().toISOString(),
      })
    }
    
    const sql = user
      ? "SELECT * FROM models WHERE is_active = 1"
      : "SELECT * FROM models WHERE is_public = 1 AND is_active = 1"

    const dbModels = await query<any>(sql)

    const freeModels = dbModels.map((model) => ({
      id: model.id,
      name: model.name.replace(/\s*\(free\)/i, "").trim(),
      description: model.description,
      context_length: model.context_length,
      pricing: {
        prompt: model.pricing_prompt,
        completion: model.pricing_completion,
      },
      architecture: {
        modality: model.architecture_modality
      },
      architecture_modality: model.architecture_modality,
    }))

    return NextResponse.json({
      models: freeModels,
      total: freeModels.length,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Error fetching models:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch models" },
      { status: 500 }
    )
  }
}

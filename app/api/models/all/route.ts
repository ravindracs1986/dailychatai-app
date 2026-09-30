import { NextResponse, NextRequest } from "next/server"
import { query } from "@/lib/db"
import { getCurrentUser } from "@/lib/get-current-user"
import { isLocalLlmActive } from "@/config"
import { isLocalLlmEnabledForUser } from "@/lib/usage"
import { listActiveLocalModels } from "@/lib/local-llm"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    const includeLocal = !!user && isLocalLlmActive() && (await isLocalLlmEnabledForUser(user.id))

    const sql = "SELECT * FROM models WHERE is_active = 1"

    const dbModels = await query<any>(sql)

    const openRouterModels = dbModels.map((model) => ({
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

    const localModels = includeLocal
      ? (await listActiveLocalModels()).map((m) => ({
          id: m.id,
          name: m.name,
          description: "",
          context_length: m.context_length,
          pricing: m.pricing,
          architecture: { modality: m.architecture_modality },
          architecture_modality: m.architecture_modality,
        }))
      : []
    const freeModels = [...localModels, ...openRouterModels]

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

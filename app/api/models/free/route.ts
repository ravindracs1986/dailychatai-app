import { NextResponse, NextRequest } from "next/server"
import { getEnabledCustomModels } from "@/lib/developer-config"
import { categorizeModels } from "@/lib/model-categories"
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
      provider: model.provider,
      context_length: model.context_length,
      pricing: {
        prompt: model.pricing_prompt,
        completion: model.pricing_completion,
      },
      architecture_modality: model.architecture_modality,
    }))

    const localModels = includeLocal ? await listActiveLocalModels() : []
    const freeModels = [...localModels, ...openRouterModels]

    // Categorize models by performance tier
    const categorizedModels = categorizeModels(freeModels)
    const customModels = getEnabledCustomModels()

    return NextResponse.json({
      models: freeModels,
      categorizedModels,
      customModels,
      total: freeModels.length + customModels.length,
    })
  } catch (error: any) {
    console.log("[API] Error fetching models:", error)
    return NextResponse.json(
      {
        models: [],
        categorizedModels: { ultra: [], pro: [], fast: [], normal: [], slow: [] },
        customModels: getEnabledCustomModels(),
        error: error.message,
      },
      { status: 200 },
    )
  }
}

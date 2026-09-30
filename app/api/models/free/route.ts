import { NextResponse, NextRequest } from "next/server"
import { getEnabledCustomModels } from "@/lib/developer-config"
import { categorizeModels } from "@/lib/model-categories"
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
        provider: m.provider || "local",
        context_length: Number(m.context_length || 0) || 8192,
        pricing: { prompt: "0", completion: "0" },
        architecture_modality: m.architecture_modality || "text",
      }))
      const categorizedModels = categorizeModels(freeModels)
      return NextResponse.json({
        models: freeModels,
        categorizedModels,
        customModels: [],
        total: freeModels.length,
      })
    }
    
    const sql = user 
      ? "SELECT * FROM models WHERE is_active = 1"
      : "SELECT * FROM models WHERE is_public = 1 AND is_active = 1"

    const dbModels = await query<any>(sql)

    const freeModels = dbModels.map((model) => ({
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

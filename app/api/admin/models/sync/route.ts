import { NextResponse } from "next/server"
import { getRandomApiKey } from "@/lib/developer-config"
import { execute } from "@/lib/db"

const OPENROUTER_API = "https://openrouter.ai/api/v1"

export async function POST() {
  try {
    const apiKey = getRandomApiKey()

    if (!apiKey) {
      return NextResponse.json({ error: "No API keys configured" }, { status: 500 })
    }

    const response = await fetch(`${OPENROUTER_API}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch models from OpenRouter: ${response.status}`)
    }

    const data = await response.json()
    const models = data.data

    let syncedCount = 0
    
    // Process models in batches or one by one
    for (const model of models) {
      const isFree = model.pricing && model.pricing.prompt === "0" && model.pricing.completion === "0"
      
      const sql = `
        INSERT INTO models (
          id, name, description, context_length, 
          pricing_prompt, pricing_completion, 
          architecture_modality, provider, 
          is_free, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          description = VALUES(description),
          context_length = VALUES(context_length),
          pricing_prompt = VALUES(pricing_prompt),
          pricing_completion = VALUES(pricing_completion),
          architecture_modality = VALUES(architecture_modality),
          provider = VALUES(provider),
          is_free = VALUES(is_free),
          updated_at = NOW()
      `
      
      const provider = model.id.includes('/') ? model.id.split('/')[0] : (model.architecture?.modality?.includes("image") ? "vision" : "text")
      
      await execute(sql, [
        model.id,
        model.name || model.id,
        model.description || "",
        model.context_length || 0,
        model.pricing?.prompt || "0",
        model.pricing?.completion || "0",
        model.architecture?.modality || "text",
        provider,
        isFree ? 1 : 0
      ])
      
      syncedCount++
    }

    return NextResponse.json({ 
      success: true, 
      message: `Synced ${syncedCount} models`,
      count: syncedCount 
    })
  } catch (error: any) {
    console.error("Sync error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

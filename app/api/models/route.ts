import { type NextRequest, NextResponse } from "next/server"
import { API_CONFIG } from "@/lib/api-config"

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 400 })
    }

    const response = await fetch(API_CONFIG.OPENROUTER_MODELS_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch models" }, { status: response.status })
    }

    const data = await response.json()

    // Filter for free models that are available
    const freeModels = data.data
      .filter((model) => {
        const pricing = model.pricing
        return (
          (pricing?.prompt === "0" || pricing?.completion === "0") &&
          model.id.includes("free") === false &&
          !model.id.includes("gpt-4")
        )
      })
      .map((model) => ({
        id: model.id,
        name: model.name || model.id,
        architecture: model.architecture || {},
      }))

    // If no truly free models, include some popular affordable ones
    const allModels =
      freeModels.length > 0
        ? freeModels
        : data.data.slice(0, 10).map((model) => ({
            id: model.id,
            name: model.name || model.id,
            architecture: model.architecture || {},
          }))

    return NextResponse.json({
      models: allModels,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

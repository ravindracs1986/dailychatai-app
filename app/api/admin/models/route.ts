import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const models = await query<any>("SELECT * FROM models ORDER BY name ASC")
    
    const formattedModels = models.map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
      context_length: m.context_length,
      pricing: {
        prompt: m.pricing_prompt,
        completion: m.pricing_completion
      },
      architecture: {
        modality: m.architecture_modality
      },
      provider: m.provider,
      is_active: !!m.is_active,
      is_free: !!m.is_free,
      is_public: !!m.is_public
    }))

    return NextResponse.json({ models: formattedModels })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

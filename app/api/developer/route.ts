import { NextResponse } from "next/server"
import { DEVELOPER_CONFIG, hasConfiguredApiKeys, getDefaultApiKey } from "@/lib/developer-config"
import { isLocalLlmActive } from "@/config"

export async function GET() {
  try {
    return NextResponse.json({
      hasApiKeys: hasConfiguredApiKeys(),
      defaultApiKey: getDefaultApiKey(),
      localLlmActive: isLocalLlmActive(),
      features: DEVELOPER_CONFIG.features,
    })
  } catch (err) {
    return NextResponse.json({
      hasApiKeys: false,
      defaultApiKey: null,
      localLlmActive: false,
      features: {
        allowUserApiKeys: false,
        allowCustomModels: true,
        imageGenerationEnabled: true,
        localLlmEnabled: false,
      },
    })
  }
}

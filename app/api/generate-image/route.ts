import { type NextRequest, NextResponse } from "next/server"
import { API_CONFIG } from "@/lib/api-config"
import { isDatabaseConfigured } from "@/lib/db"
import { getRandomApiKey, getAllApiKeys } from "@/config"
import { getAnonymousUsage, incrementAnonymousUsage, type GeoInfo } from "@/lib/usage"
import { getRateLimitKey } from "@/lib/rate-limit"

function getGeoInfo(req: NextRequest): GeoInfo {
  const headers = req.headers
  return {
    country: headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry"),
    region: headers.get("x-vercel-ip-region"),
    city: headers.get("x-vercel-ip-city"),
    latitude: parseFloat(headers.get("x-vercel-ip-latitude") || "") || null,
    longitude: parseFloat(headers.get("x-vercel-ip-longitude") || "") || null,
    timezone: headers.get("x-vercel-ip-timezone"),
    isp: null,
    connection_type: null,
    zip_code: null
  }
}

export async function POST(request: NextRequest) {
  try {
    let { apiKey, model, message } = await request.json()
    const dbConfigured = await isDatabaseConfigured()
    let isAnonymous = false
    let ip = ""
    const geoInfo = getGeoInfo(request)

    // Handle anonymous usage if no API key or if it matches a system key
    const systemKeys = getAllApiKeys()
    const isSystemKey = apiKey && systemKeys.includes(apiKey)

    if (!apiKey || isSystemKey) {
      if (!dbConfigured) {
        return NextResponse.json({ error: "API Key required" }, { status: 400 })
      }

      ip = getRateLimitKey(request.headers)
      const usage = await getAnonymousUsage(ip)
      
      if (usage.message_count >= 5) {
        return NextResponse.json(
          { error: "Daily limit reached. Please sign up for more." }, 
          { status: 403 }
        )
      }

      apiKey = getRandomApiKey()
      if (!apiKey) {
        return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
      }
      isAnonymous = true
    }

    if (!apiKey || !model || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const response = await fetch(`${API_CONFIG.OPENROUTER_BASE_URL}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: message,
        size: "1024x1024",
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { error: error.error?.message || "Image generation failed" },
        { status: response.status },
      )
    }

    const data = await response.json()
    const imageUrl = data.data?.[0]?.url || ""

    if (isAnonymous) {
      // Image generation counts as usage (1 message, 0 tokens for now as token usage is unclear)
      await incrementAnonymousUsage(ip, 0, null, geoInfo)
    }

    return NextResponse.json({
      content: imageUrl,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

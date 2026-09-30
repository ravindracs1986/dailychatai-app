import { NextResponse } from "next/server"
import { CONFIG, isLocalLlmActive } from "@/config"
import dns from "dns"

export async function GET() {
  const active = isLocalLlmActive()
  if (!active || !CONFIG.localLlm.baseUrl) {
    return NextResponse.json({ active: false, error: "Local LLM not enabled" }, { status: 200 })
  }

  try {
    dns.setDefaultResultOrder("ipv4first")
  } catch {}

  const startedAt = Date.now()
  try {
    const res = await fetch(`${CONFIG.localLlm.baseUrl}/models`, {
      headers: CONFIG.localLlm.apiKey ? { Authorization: `Bearer ${CONFIG.localLlm.apiKey}` } : {},
      cache: "no-store",
    })
    const ms = Date.now() - startedAt
    const text = await res.text()
    return NextResponse.json(
      {
        active: true,
        baseUrl: CONFIG.localLlm.baseUrl,
        status: res.status,
        ok: res.ok,
        ms,
        bodyPreview: text.slice(0, 500),
      },
      { status: 200 }
    )
  } catch (e) {
    const ms = Date.now() - startedAt
    return NextResponse.json(
      { active: true, baseUrl: CONFIG.localLlm.baseUrl, ok: false, ms, error: e instanceof Error ? e.message : String(e) },
      { status: 200 }
    )
  }
}


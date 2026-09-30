import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { execute, isDatabaseConfigured } from "@/lib/db"
import { fetchLocalLlmModelRows } from "@/lib/local-llm"
import { isLocalLlmActive } from "@/config"

export async function POST(request: NextRequest) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  const currentUser = await getCurrentUser(request)
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  if (!isLocalLlmActive()) {
    return NextResponse.json(
      { success: false, error: "Local LLM is not active (check LOCAL_LLM_ENABLED + LLM_BASE_URL)" },
      { status: 200 }
    )
  }

  try {
    const models = await fetchLocalLlmModelRows()
    let synced = 0

    for (const m of models) {
      // Keep admin-controlled is_active if the row already exists
      await execute(
        `INSERT INTO local_models (id, name, context_length, architecture_modality, provider, is_active, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, NOW())
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           context_length = VALUES(context_length),
           architecture_modality = VALUES(architecture_modality),
           provider = VALUES(provider),
           updated_at = NOW()`,
        [m.id, m.name || m.id, m.context_length || 0, m.architecture_modality || "text", "local"]
      )
      synced++
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${synced} local models`,
      count: synced,
    })
  } catch (e: any) {
    console.error("[admin][local-llm] sync models", e)
    return NextResponse.json({ success: false, error: e?.message || "Sync failed" }, { status: 500 })
  }
}


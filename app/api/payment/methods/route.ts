import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { isDatabaseConfigured } from "@/lib/db"

export async function GET(request: NextRequest) {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ methods: [] })
  }
  try {
    const methods = await query("SELECT id, name, title, description, config FROM payment_gateways WHERE is_active = TRUE")
    
    // Sanitize config
    const sanitizedMethods = methods.map((m: any) => {
        let config = m.config;
        if (typeof config === 'string') {
            try {
                config = JSON.parse(config);
            } catch (e) {
                config = {};
            }
        }
        
        // Remove sensitive keys
        if (config) {
            delete config.secret_key;
            delete config.access_token;
            delete config.webhook_secret;
        }

        return {
            ...m,
            config
        };
    });
    
    return NextResponse.json({ methods: sanitizedMethods })
  } catch (error) {
    console.error("Fetch payment methods error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

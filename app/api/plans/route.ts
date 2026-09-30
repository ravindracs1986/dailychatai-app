import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { isDatabaseConfigured } from "@/lib/db"

export interface PlanRow {
  id: string
  name: string
  price: number | null
  messages_per_day: number | null
  model: string | null
  features: string | null
}

export async function GET() {
  if (!(await isDatabaseConfigured())) {
    return NextResponse.json({ plans: [] })
  }
  const rows = await query<PlanRow>("SELECT id, name, price, messages_per_day, model, features FROM plans ORDER BY price ASC")
  const plans = rows.map((p) => {
    let features = p.features == null ? null : typeof p.features === "string" ? JSON.parse(p.features) : p.features
    
    // Normalize features if it's just an array of strings
    if (Array.isArray(features)) {
      features = { included: features }
    }
    
    return {
      id: p.id,
      name: p.name,
      price: p.price,
      messages_per_day: p.messages_per_day,
      model: p.model,
      features,
    }
  })
  return NextResponse.json({ plans })
}

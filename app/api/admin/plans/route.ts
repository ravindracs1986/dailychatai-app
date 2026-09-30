import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { query, execute, generateUUID } from "@/lib/db"
import { z } from "zod"

const PlanSchema = z.object({
  name: z.string().min(1),
  price: z.number().nullable().optional(),
  messages_per_day: z.number().nullable().optional(),
  model: z.string().nullable().optional(),
  features: z.string().nullable().optional(),
})

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user || user.role !== "admin") {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const plans = await query("SELECT * FROM plans ORDER BY price ASC")
  return NextResponse.json({ plans })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user || user.role !== "admin") {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const json = await req.json()
    const body = PlanSchema.parse(json)
    const id = generateUUID()

    await execute(
      "INSERT INTO plans (id, name, price, messages_per_day, model, features) VALUES (?, ?, ?, ?, ?, ?)",
      [
        id,
        body.name,
        body.price ?? null,
        body.messages_per_day ?? null,
        body.model ?? null,
        body.features ?? null
      ]
    )

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error(error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

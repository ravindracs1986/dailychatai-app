import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/get-current-user"
import { execute } from "@/lib/db"
import { z } from "zod"

const PlanSchema = z.object({
  name: z.string().min(1),
  price: z.number().nullable().optional(),
  messages_per_day: z.number().nullable().optional(),
  model: z.string().nullable().optional(),
  features: z.string().nullable().optional(),
})

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser(req)
  if (!user || user.role !== "admin") {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const json = await req.json()
    const body = PlanSchema.parse(json)

    await execute(
      "UPDATE plans SET name=?, price=?, messages_per_day=?, model=?, features=? WHERE id=?",
      [
        body.name,
        body.price ?? null,
        body.messages_per_day ?? null,
        body.model ?? null,
        body.features ?? null,
        params.id
      ]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser(req)
  if (!user || user.role !== "admin") {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    await execute("DELETE FROM plans WHERE id=?", [params.id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { execute, query } from "@/lib/db"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const email = searchParams.get("email")

  if (!email) {
    // List users to help find one to promote
    try {
      const users = await query("SELECT id, username, email, role FROM users LIMIT 5")
      return NextResponse.json({ 
        message: "Provide ?email=... to promote a user. Here are some users:",
        users 
      })
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  try {
    // Check if user exists
    const users: any[] = await query(
      "SELECT id, username, role FROM users WHERE email = ?",
      [email]
    ) as any[]

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const user = users[0]

    // Update role
    await execute(
      "UPDATE users SET role = 'admin' WHERE id = ?",
      [user.id]
    )

    return NextResponse.json({ 
      success: true, 
      message: `User ${user.username} (${email}) promoted to admin`,
      previous_role: user.role,
      new_role: 'admin'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

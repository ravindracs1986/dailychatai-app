"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { CONFIG } from "@/config"

export default function RegisterPage() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { register, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) router.replace("/chat")
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }
    setLoading(true)
    const result = await register(username, email, password)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.push("/chat")
  }

  if (user) return null

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="w-full max-w-md p-8 border-border/50 shadow-xl">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <img src={CONFIG.site.logo} alt="Logo" className="h-10 object-contain" />
           
          </Link>
          <h1 className="text-2xl font-bold">Create account</h1>
          <p className="text-muted-foreground text-sm mt-1">Register with email and password</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="space-y-2">
              <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</div>
              {(error.includes("Database") || error.includes("not configured") || error.includes("connection failed")) && (
                <p className="text-xs text-muted-foreground">
                  Setup: add <code className="bg-muted px-1 rounded">DATABASE_URL</code> to .env.dev, start MariaDB (e.g. <code className="bg-muted px-1 rounded">docker compose up -d</code>), create the database, then run <code className="bg-muted px-1 rounded">migrations/001_initial.sql</code> and <code className="bg-muted px-1 rounded">002_seed_plans.sql</code>. See README.
                </p>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={2}
              maxLength={255}
              className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="johndoe or you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
            />
            <p className="text-xs text-muted-foreground mt-1">At least 8 characters</p>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Sign up"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  )
}

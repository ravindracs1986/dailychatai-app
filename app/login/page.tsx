"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { CONFIG } from "@/config"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const { login, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) router.replace("/chat")
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setNeedsVerification(false)
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      if (result.code === "EMAIL_NOT_VERIFIED") {
        setNeedsVerification(true)
      }
      return
    }
    router.push("/chat")
  }

  const handleResendVerification = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setError("Verification email sent! Please check your inbox.")
        setNeedsVerification(false)
      } else {
        setError(data.error || "Failed to send verification email")
      }
    } catch (e) {
      setError("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (user) return null

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="w-full max-w-md p-8 border-border/50 shadow-xl">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <img src={CONFIG.site.logo} alt="Logo" className="h-10 object-contain" />
           </Link>
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="text-muted-foreground text-sm mt-1">Use your email and password</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
              {needsVerification && (
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-destructive underline ml-2"
                  onClick={handleResendVerification}
                  type="button"
                >
                  Resend Verification Email
                </Button>
              )}
            </div>
          )}
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
              className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
            />
          </div>
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm text-muted-foreground hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  )
}

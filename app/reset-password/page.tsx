"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CONFIG } from "@/config"

function ResetPasswordContent() {
  const [token, setToken] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const t = searchParams.get("token")
    if (t) setToken(t)
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }
    if (!token) {
      setError("Missing reset token")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((data as { error?: string }).error || "Reset failed")
        setLoading(false)
        return
      }
      setSuccess(true)
      setTimeout(() => router.push("/login"), 2000)
    } catch {
      setError("Network error")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="w-full max-w-md p-8 border-border/50 shadow-xl">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <img src={CONFIG.site.logo} alt="Logo" className="w-10 h-10 object-contain" />
            <span className="font-semibold text-lg">{CONFIG.site.name}</span>
          </Link>
          <h1 className="text-2xl font-bold">Set new password</h1>
          <p className="text-muted-foreground text-sm mt-1">Enter your new password below</p>
        </div>
        {success ? (
          <p className="text-center text-muted-foreground">Password reset. Redirecting to sign in...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                {error}
              </div>
            )}
            {!token && (
              <p className="text-sm text-muted-foreground">
                Use the link from your email to reset your password.
              </p>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !token}>
              {loading ? "Resetting..." : "Reset password"}
            </Button>
          </form>
        )}
        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}

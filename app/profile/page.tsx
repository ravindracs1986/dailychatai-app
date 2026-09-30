"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"
import AuthenticatedLayout from "@/components/authenticated-layout"
import { ApiKeyManager } from "@/components/api-key-manager"

export default function ProfilePage() {
  const { user, accessToken, loading, authEnabled, setUser, refreshUser } = useAuth()
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [country, setCountry] = useState("")
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [saving, setSaving] = useState(false)
  const [usage, setUsage] = useState<{ usage_today: number; usage_limit: number; canSend: boolean } | null>(null)

  useEffect(() => {
    if (user) {
      setUsername(user.username)
      setProfilePicUrl(user.profile_pic_url)
    }
  }, [user])

  useEffect(() => {
    if (!accessToken) return
    fetch("/api/usage", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => res.ok && res.json())
      .then((data) => data && setUsage(data))
      .catch(() => {})
  }, [accessToken])

  useEffect(() => {
    if (!loading) {
      if (!authEnabled) {
        router.replace("/")
      }
      // AuthenticatedLayout will handle the !user redirect
    }
  }, [loading, authEnabled, router])

  if (loading || (!authEnabled)) {
    return null
  }
  
  // If we are still loading user but auth is enabled, AuthenticatedLayout handles the loading state.
  // We can just render the layout. If user is null, AuthenticatedLayout will redirect.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSaving(true)
    try {
      const body: Record<string, unknown> = { 
        username,
        name: name || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        state: state || null,
        country: country || null,
      }
      if (profilePicUrl !== undefined) body.profile_pic_url = profilePicUrl
      if (newPassword) {
        body.current_password = currentPassword
        body.new_password = newPassword
      }
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((data as { error?: string }).error || "Update failed")
        setSaving(false)
        return
      }
      const updatedUser = (data as { user?: import("@/contexts/auth-context").AuthUser }).user
      if (updatedUser) setUser(updatedUser)
      setSuccess("Profile updated")
      if (newPassword) {
        setCurrentPassword("")
        setNewPassword("")
      }
      refreshUser()
    } catch {
      setError("Network error")
    }
    setSaving(false)
  }

  return (
    <AuthenticatedLayout>
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto py-10 px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="p-6 md:p-8 border-border/50 shadow-lg h-fit">
              <h1 className="text-2xl font-bold mb-6">Profile</h1>
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="w-16 h-16">
                <AvatarImage src={profilePicUrl || undefined} alt={user?.username} />
                <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user?.username}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                {usage && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Usage: {usage.usage_today} / {usage.usage_limit === 0 ? "∞" : usage.usage_limit} messages today
                  </p>
                )}
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</div>
              )}
              {success && (
                <div className="text-sm text-green-600 dark:text-green-500 bg-green-500/10 rounded-lg p-3">
                  {success}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={2}
                  maxLength={255}
                  className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={20}
                    className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  maxLength={255}
                  className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    maxLength={100}
                    className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="New York"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    maxLength={100}
                    className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="NY"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    maxLength={100}
                    className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="USA"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Profile picture URL</label>
                <input
                  type="url"
                  value={profilePicUrl || ""}
                  onChange={(e) => setProfilePicUrl(e.target.value || null)}
                  className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">New password (optional)</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring mb-2"
                  placeholder="Current password"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="New password"
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </form>
          </Card>

            <div className="space-y-8">
              <Card className="p-6 md:p-8 border-border/50 shadow-lg h-fit">
                 <ApiKeyManager />
              </Card>

              <Card className="p-6 md:p-8 border-border/50 shadow-lg h-fit">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Active Sessions</h2>
                </div>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-primary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                          <line x1="8" y1="21" x2="16" y2="21" />
                          <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-sm">Desktop App</p>
                        <p className="text-xs text-muted-foreground">
                          Created about {i === 0 ? "24 days" : i === 1 ? "1 month" : i === 2 ? "1 month" : "2 months"} ago
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="h-8">
                      Revoke
                    </Button>
                  </div>
                ))}
                
                <div className="pt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <p>... See 3 more</p>
                </div>
                
                <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border/50">
                  Session revocation may take up to 10 minutes to complete
                </p>
              </div>
            </Card>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}

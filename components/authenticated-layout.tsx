"use client"

import { useState, useEffect } from "react"
import ChatAppSidebar from "@/components/chat-app-sidebar"
import ThemeProvider from "@/components/theme-provider"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"
import CreateProjectModal from "@/components/create-project-modal"
import { usePathname, useRouter } from "next/navigation"
import AppHeader from "@/components/app-header"
import UpgradePlansModal from "@/components/upgrade-plans-modal"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState("light")
  const { user, loading } = useAuth()
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const [subscriptionRestricted, setSubscriptionRestricted] = useState(false)
  const [subscriptionChecked, setSubscriptionChecked] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("theme") || "light"
    setTheme(stored)
    document.documentElement.classList.toggle("dark", stored === "dark")
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [loading, user, router])

  useEffect(() => {
    if (!user) {
      setSubscriptionRestricted(false)
      setSubscriptionChecked(false)
      return
    }
    if (user.role === "admin") {
      setSubscriptionRestricted(false)
      setSubscriptionChecked(true)
      return
    }

    let cancelled = false
    const run = async () => {
      try {
        const token = localStorage.getItem("auth_access_token")
        if (!token) {
          if (!cancelled) {
            setSubscriptionRestricted(false)
            setSubscriptionChecked(true)
          }
          return
        }
        const res = await fetch("/api/subscriptions/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = res.ok ? await res.json().catch(() => null) : null
        const restricted = !!data?.access?.restricted
        if (!cancelled) {
          setSubscriptionRestricted(restricted)
          setSubscriptionChecked(true)
        }
      } catch {
        if (!cancelled) {
          setSubscriptionRestricted(false)
          setSubscriptionChecked(true)
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.role])

  useEffect(() => {
    if (!subscriptionChecked) return
    if (!subscriptionRestricted) return
    if (pathname === "/subscription") return
    router.replace("/subscription")
  }, [pathname, router, subscriptionChecked, subscriptionRestricted])

  const handleThemeToggle = () => {
    const next = theme === "light" ? "dark" : "light"
    setTheme(next)
    localStorage.setItem("theme", next)
    document.documentElement.classList.toggle("dark", next === "dark")
  }

  if (loading || !user || (!subscriptionChecked && user.role !== "admin")) {
    return (
       <div className="min-h-screen flex items-center justify-center bg-background">
         <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
       </div>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <SidebarProvider>
        <ChatAppSidebar
          onCreateProject={() => setCreateProjectOpen(true)}
          subscriptionRestricted={subscriptionRestricted}
        />
        <SidebarInset className="min-h-svh overflow-hidden">
          <AppHeader
            onUpgradeClick={() => setUpgradeModalOpen(true)}
            theme={theme}
            onThemeToggle={handleThemeToggle}
          />
          <div className="flex-1 min-h-0 flex flex-col min-w-0 overflow-hidden">
            {children}
          </div>
        </SidebarInset>
        <CreateProjectModal
          open={createProjectOpen}
          onOpenChange={setCreateProjectOpen}
          onProjectCreated={() => {}} 
          project={null}
        />
        <UpgradePlansModal 
          open={upgradeModalOpen} 
          onOpenChange={setUpgradeModalOpen} 
        />
      </SidebarProvider>
    </ThemeProvider>
  )
}

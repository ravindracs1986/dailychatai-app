"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Zap,
  HelpCircle,
  User,
  LogOut,
  Sun,
  Moon,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { SidebarTrigger } from "@/components/ui/sidebar"

interface AppHeaderProps {
  onUpgradeClick?: () => void
  title?: string
  theme?: "light" | "dark" | string
  onThemeToggle?: () => void
}

export default function AppHeader({
  onUpgradeClick,
  title = "AI Chat",
  theme,
  onThemeToggle,
}: AppHeaderProps) {
  const router = useRouter()
  const { user, logout } = useAuth()

  if (!user) return null

  const isAdmin = user.role === "admin"

  return (
    <header className="h-14 shrink-0 sticky top-0 z-20 border-b flex items-center justify-between px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <h1 className="font-semibold text-lg">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {!isAdmin && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 cursor-pointer"
              onClick={onUpgradeClick}
            >
              <Zap className="w-4 h-4" />
              Upgrade
            </Button>
            <Link href="/help">
              <Button variant="ghost" size="icon" title="Help" className="cursor-pointer">
                <HelpCircle className="w-4 h-4" />
              </Button>
            </Link>
          </>
        )}

        {onThemeToggle && (
          <>
            {/* Desktop: show Light/Dark buttons */}
            <div className="hidden md:flex items-center gap-2">
              <Button
                variant={theme === "light" ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5 h-8"
                onClick={() => theme !== "light" && onThemeToggle()}
              >
                <Sun className="w-4 h-4" />
                Light
              </Button>
              <Button
                variant={theme === "dark" ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5 h-8"
                onClick={() => theme !== "dark" && onThemeToggle()}
              >
                <Moon className="w-4 h-4" />
                Dark
              </Button>
            </div>

            {/* Mobile: icon toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onThemeToggle}
              title="Toggle theme"
            >
              {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full cursor-pointer">
              <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                {user.username.slice(0, 2).toUpperCase()}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                <User className="w-4 h-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => {
                logout()
                router.push("/")
              }}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

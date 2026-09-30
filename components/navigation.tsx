"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Sun, Moon, Menu, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CONFIG } from "@/config"
import { API_CONFIG } from "@/lib/api-config"
import { useAuth, type AuthUser } from "@/contexts/auth-context"

interface NavigationProps {
  theme?: string
  onThemeToggle?: () => void
  imageMode?: boolean
  onImageModeToggle?: (value: boolean) => void
  hasImageModel?: boolean
  hideControls?: boolean
  user?: AuthUser | null
}

export default function Navigation({
  theme,
  onThemeToggle,
  imageMode,
  onImageModeToggle,
  hasImageModel,
  hideControls = false,
  user: userProp,
}: NavigationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const auth = useAuth()
  const user = userProp ?? auth.user

  const [internalTheme, setInternalTheme] = useState("light")

  useEffect(() => {
    if (theme === undefined) {
      const savedTheme = localStorage.getItem(API_CONFIG.STORAGE_KEYS.THEME) || "light"
      setInternalTheme(savedTheme)
      document.documentElement.classList.toggle("dark", savedTheme === "dark")
    }
  }, [theme])

  const currentTheme = theme ?? internalTheme

  const handleThemeToggle = () => {
    if (onThemeToggle) {
      onThemeToggle()
    } else {
      const newTheme = internalTheme === "light" ? "dark" : "light"
      setInternalTheme(newTheme)
      localStorage.setItem(API_CONFIG.STORAGE_KEYS.THEME, newTheme)
      document.documentElement.classList.toggle("dark", newTheme === "dark")
    }
  }

  return (
    <nav className="border-b bg-white dark:bg-background sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href={user ? "/chat" : "/"} className="flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0 min-w-0">
          <div className="relative h-10">
            <img
              src={CONFIG.site.logo}
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleThemeToggle}
                title="Toggle theme"
                className="cursor-pointer"
              >
                {currentTheme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full cursor-pointer">
                    <Avatar className="w-8 h-8 cursor-pointer">
                      <AvatarImage src={user.profile_pic_url || undefined} alt={user.username} />
                      <AvatarFallback className="text-xs">
                        {user.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
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
                      auth.logout()
                      router.push("/")
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <div className="hidden sm:flex items-center gap-6 mr-2">
                <Link
                  href="/about"
                  className={`text-sm font-medium transition-colors hover:text-foreground cursor-pointer ${
                    pathname === "/about"
                      ? "text-foreground bg-background/80 dark:bg-background/50 px-2 py-1 rounded"
                      : "text-muted-foreground"
                  }`}
                >
                  About
                </Link>
                <Link
                  href="/contact"
                  className={`text-sm font-medium transition-colors hover:text-foreground cursor-pointer ${
                    pathname === "/contact"
                      ? "text-foreground bg-background/80 dark:bg-background/50 px-2 py-1 rounded"
                      : "text-muted-foreground"
                  }`}
                >
                  Contact
                </Link>
              </div>
              <Link href="/login">
                <Button
                  className="rounded-full bg-black text-white hover:bg-black/90 border-0 px-5 dark:bg-white dark:text-black dark:hover:bg-white/90 cursor-pointer"
                  size="sm"
                >
                  Log in
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  variant="outline"
                  className="rounded-full border-2 border-border bg-background hover:bg-muted text-foreground px-5 cursor-pointer"
                  size="sm"
                >
                  Sign up for free
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleThemeToggle}
                title="Toggle theme"
                className="cursor-pointer"
              >
                {currentTheme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

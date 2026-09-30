"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  MessageSquarePlus,
  FolderOpen,
  FileText,
  FileCode2,
  Users,
  History,
  Plus,
  Settings,
  HelpCircle,
  Search,
  ShieldAlert,
  CreditCard,
  BarChart,
  Package,
  CheckCircle,
  Cpu,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CONFIG } from "@/config"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { getStoredAccessToken } from "@/contexts/auth-context"

interface ChatAppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onCreateProject?: () => void
  subscriptionRestricted?: boolean
}

const userNavItems = [
  { href: "/chat", label: "New Chat", icon: MessageSquarePlus },
  { href: "/chats", label: "All Chats", icon: History },
  { href: "/community", label: "Community", icon: Users },
  { href: "/subscription", label: "Subscription", icon: CreditCard },
  { href: "/usage", label: "Invoice & Billing", icon: BarChart },
]

const adminNavItems = [
  { href: "/admin/templates", label: "Templates", icon: FileText },
  { href: "/admin/model", label: "Models", icon: MessageSquarePlus },
  { href: "/admin/local-llm", label: "Local LLM", icon: Cpu },
  { href: "/admin/documents", label: "Documents", icon: FileCode2 },
  { href: "/admin/plans", label: "Subscription Plans", icon: Package },
    { href: "/admin/gateways", label: "Payment Gateways", icon: CreditCard },
    { href: "/admin/payments", label: "Payment Approvals", icon: CheckCircle },
  ]

const bottomItems = [
  { href: "/profile", label: "Settings", icon: Settings },
  { href: "/help", label: "Help", icon: HelpCircle },
]

interface ConversationItem {
  id: string
  title: string
  is_pinned: boolean
  created_at: string
  updated_at: string
}

interface ProjectItem {
  id: string
  name: string
  emoji?: string | null
}

const LS_SELECTED_PROJECT_ID = "selected_project_id"

export default function ChatAppSidebar({
  onCreateProject,
  subscriptionRestricted,
  ...props
}: ChatAppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const restricted = !!subscriptionRestricted && user?.role !== "admin"
  const isChat = pathname === "/chat"
  const [recentConversations, setRecentConversations] = useState<ConversationItem[]>([])
  const [recentLoading, setRecentLoading] = useState(false)
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [sidebarSearch, setSidebarSearch] = useState("")

  const handleResendVerification = async () => {
    try {
      const token = localStorage.getItem("auth_access_token")
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`
        }
      })
      const data = await res.json()
      
      if (res.ok) {
        toast({
            title: "Verification Sent",
            description: data.message || "Please check your email inbox.",
        })
      } else {
        toast({
            title: "Error",
            description: data.error || "Failed to send verification email",
            variant: "destructive"
        })
      }
    } catch (err) {
        toast({
            title: "Error",
            description: "Something went wrong",
            variant: "destructive"
        })
    }
  }

  const baseNavItems = user?.role === "admin" ? adminNavItems : userNavItems
  const navItems = restricted ? baseNavItems.filter((i) => i.href === "/subscription") : baseNavItems
  const showRecentChats = useMemo(() => !!user && user.role !== "admin" && !restricted, [user, restricted])

  const handleItemClick = (e: React.MouseEvent, item: typeof navItems[0]) => {
    if ((item as any).action === "create_project" && onCreateProject) {
      e.preventDefault()
      onCreateProject()
    }
  }

  const fetchRecentChats = useCallback(() => {
    if (!showRecentChats) return
    const token = getStoredAccessToken()
    if (!token) return

    setRecentLoading(true)
    const url = selectedProjectId
      ? `/api/projects/${encodeURIComponent(selectedProjectId)}/conversations?limit=5&offset=0`
      : "/api/conversations?limit=5&offset=0"

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : { conversations: [] }))
      .then((data) => {
        const rows: ConversationItem[] = Array.isArray(data?.conversations) ? data.conversations : []
        setRecentConversations(rows.slice(0, 5))
      })
      .catch(() => setRecentConversations([]))
      .finally(() => setRecentLoading(false))
  }, [showRecentChats, selectedProjectId])

  const fetchProjects = useCallback(() => {
    if (!showRecentChats) return
    const token = getStoredAccessToken()
    if (!token) return

    setProjectsLoading(true)
    fetch("/api/projects", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : { projects: [] }))
      .then((data) => {
        const rows: ProjectItem[] = Array.isArray(data?.projects) ? data.projects : []
        setProjects(rows)
      })
      .catch(() => setProjects([]))
      .finally(() => setProjectsLoading(false))
  }, [showRecentChats])

  useEffect(() => {
    fetchRecentChats()
  }, [fetchRecentChats])

  useEffect(() => {
    const handler = () => fetchRecentChats()
    window.addEventListener("conversations:changed", handler as EventListener)
    return () => window.removeEventListener("conversations:changed", handler as EventListener)
  }, [fetchRecentChats])

  useEffect(() => {
    // initialize selected project from localStorage
    if (typeof window === "undefined") return
    const stored = localStorage.getItem(LS_SELECTED_PROJECT_ID)
    setSelectedProjectId(stored && stored.length > 0 ? stored : null)
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    // when project changes, refresh recent chats
    fetchRecentChats()
  }, [selectedProjectId, fetchRecentChats])

  useEffect(() => {
    if (pathname !== "/chats") return
    const q = (searchParams?.get("q") || "").trim()
    setSidebarSearch(q)
  }, [pathname, searchParams])

  const handleSelectProject = (id: string | null) => {
    setSelectedProjectId(id)
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(LS_SELECTED_PROJECT_ID, id)
      else localStorage.removeItem(LS_SELECTED_PROJECT_ID)
      window.dispatchEvent(new CustomEvent("project:selected", { detail: { projectId: id } }))
      window.dispatchEvent(new CustomEvent("conversations:changed"))
    }
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="sticky top-0 z-10 bg-sidebar">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link
                href={user?.role === "admin" ? "/admin" : restricted ? "/subscription" : "/chat"}
                className="flex items-center gap-2 hover:opacity-90 w-full justify-center"
              >
                <div className="w-full max-w-[180px] h-10 flex items-center justify-center">
                   <img src={CONFIG.site.logo} alt="dailychatai" className="w-full h-full object-contain" />
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2 py-2">
          {!restricted && (
           <div className="relative group-data-[collapsible=icon]:hidden">
             <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
             <Input
               type="text"
               placeholder="Search"
               className="w-full h-8 pl-8 text-sm bg-background shadow-none"
               value={sidebarSearch}
               onChange={(e) => setSidebarSearch(e.target.value)}
               onKeyDown={(e) => {
                 if (e.key !== "Enter") return
                 const q = sidebarSearch.trim()
                 router.push(q ? `/chats?q=${encodeURIComponent(q)}` : "/chats")
               }}
             />
           </div>
          )}
           <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center">
             <Search className="w-4 h-4 text-muted-foreground" />
           </div>
        </div>

       
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href
                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      onClick={(e) => handleItemClick(e, item)}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>

            {/* Projects submenu (like right-side panel, but inside left sidebar) */}
            {showRecentChats && (
              <div className="mt-2 group-data-[collapsible=icon]:hidden">
                <div className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                  Projects
                </div>

                <div className="px-2 pb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => onCreateProject?.()}
                    disabled={!onCreateProject}
                  >
                    <Plus className="w-4 h-4" />
                    New project
                  </Button>
                </div>

                <div className="max-h-44 overflow-y-auto pr-1">
                  <SidebarMenu className="space-y-0.5">
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => handleSelectProject(null)}
                        tooltip="All projects"
                        className="justify-between"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <FolderOpen />
                          <span className="truncate">All projects</span>
                        </span>
                        <span
                          className={cn(
                            "text-xs",
                            !selectedProjectId ? "text-primary" : "text-transparent"
                          )}
                        >
                          ●
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {projectsLoading ? (
                      <div className="px-2 py-2 text-xs text-muted-foreground">Loading…</div>
                    ) : (
                      projects.map((p) => (
                        <SidebarMenuItem key={p.id}>
                          <SidebarMenuButton
                            onClick={() => handleSelectProject(p.id)}
                            tooltip={p.name}
                            className="justify-between"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="shrink-0">{p.emoji || "📁"}</span>
                              <span className="truncate">{p.name}</span>
                            </span>
                            <span
                              className={cn(
                                "text-xs",
                                selectedProjectId === p.id ? "text-primary" : "text-transparent"
                              )}
                            >
                              ●
                            </span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))
                    )}
                  </SidebarMenu>
                </div>
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Settings & Help</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {!restricted &&
                bottomItems.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

              {showRecentChats && (
                <>
                  <SidebarSeparator className="my-2" />
                 <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
                    <div className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                      Recent chats
                    </div>
                    <div className="max-h-44 overflow-y-auto pr-1">
                      {recentLoading ? (
                        <div className="px-2 py-2 text-xs text-muted-foreground">Loading…</div>
                      ) : recentConversations.length === 0 ? (
                        <div className="px-2 py-2 text-xs text-muted-foreground">No chats yet</div>
                      ) : (
                        <SidebarMenu className="space-y-0.5">
                          {recentConversations.map((c) => (
                            <SidebarMenuItem key={c.id}>
                              <SidebarMenuButton asChild tooltip={c.title || "Chat"}>
                                <Link href={`/chat?c=${encodeURIComponent(c.id)}`}>
                                  <History />
                                  <span className="truncate">{c.title || "New Chat"}</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      )}
                    </div>
                  </SidebarMenuItem>
                </>
              )}
              {user?.role === "admin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="text-red-500 hover:text-red-600" tooltip="Admin">
                    <Link href="/admin">
                      <ShieldAlert />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {user && !user.email_verified_at && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={handleResendVerification}
                    className="text-yellow-600 hover:text-yellow-700 dark:text-yellow-500 dark:hover:text-yellow-400"
                    tooltip="Verify Email"
                  >
                    <ShieldAlert />
                    <span>Verify Email</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.profile_pic_url || undefined} alt={user.username} />
                  <AvatarFallback className="rounded-lg">
                    {user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.username}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

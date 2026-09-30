"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, ShieldAlert, MoreHorizontal, Shield, User, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import AuthenticatedLayout from "@/components/authenticated-layout"

interface UserData {
  id: string
  username: string
  email: string
  role: "user" | "admin"
  plan_id: string
  usage_today: number
  usage_limit: number
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/chat")
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (user?.role === "admin") {
      fetchUsers()
    }
  }, [user, page, limit])

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/admin/users?page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_access_token")}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages)
        }
      }
    } catch (error) {
      console.error("Failed to fetch users", error)
      toast.error("Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }

  const updateRole = async (userId: string, newRole: "user" | "admin") => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_access_token")}`,
        },
        body: JSON.stringify({ role: newRole }),
      })
      if (res.ok) {
        toast.success(`User role updated to ${newRole}`)
        fetchUsers()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to update role")
      }
    } catch (error) {
      toast.error("Error updating role")
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_access_token")}`,
        },
      })
      if (res.ok) {
        toast.success("User deleted successfully")
        fetchUsers()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to delete user")
      }
    } catch (error) {
      toast.error("Error deleting user")
    }
  }

  if (authLoading || !user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto py-10 px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-2">
                Manage users, monitor usage, and configure system settings.
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push("/chat")}>
              Back to Chat
            </Button>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Usage Today</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{u.username}</span>
                                <span className="text-xs text-muted-foreground">{u.email}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                                {u.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {u.plan_id ? u.plan_id.slice(-4) + "..." : "Free"}
                            </TableCell>
                            <TableCell>
                              {u.usage_today} / {u.usage_limit}
                            </TableCell>
                            <TableCell>
                              {new Date(u.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => updateRole(u.id, "admin")}>
                                    <Shield className="mr-2 h-4 w-4" />
                                    Make Admin
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateRole(u.id, "user")}>
                                    <User className="mr-2 h-4 w-4" />
                                    Remove Admin
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => deleteUser(u.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete User
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="flex items-center justify-end space-x-2 py-4 px-4 border-t">
                      <div className="flex-1 text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                      </div>
                      <div className="space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}

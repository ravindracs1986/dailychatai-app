"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import AuthenticatedLayout from "@/components/authenticated-layout"
import { useAuth } from "@/contexts/auth-context"

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body_html: string
  body_text: string
  description: string
  updated_at: string
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState<Partial<EmailTemplate>>({})
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const { accessToken } = useAuth()

  const fetchTemplates = async () => {
    if (!accessToken) return
    try {
      const res = await fetch("/api/admin/templates", {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (!res.ok) throw new Error("Failed to fetch templates")
      const data = await res.json()
      setTemplates(data.templates)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [accessToken])

  const handleSave = async () => {
    if (!currentTemplate.name || !currentTemplate.subject || !currentTemplate.body_html || !accessToken) {
      toast({ title: "Validation Error", description: "Please fill all required fields", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      const isEdit = !!currentTemplate.id
      const url = isEdit ? `/api/admin/templates/${currentTemplate.id}` : "/api/admin/templates"
      const method = isEdit ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(currentTemplate),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to save")
      }

      toast({
        title: "Success",
        description: `Template ${currentTemplate.id ? "updated" : "created"} successfully`,
      })
      setIsDialogOpen(false)
      fetchTemplates()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!accessToken) return

    try {
      const res = await fetch(`/api/admin/templates/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (!res.ok) throw new Error("Failed to delete")
      
      toast({
        title: "Success",
        description: "Template deleted successfully",
      })
      fetchTemplates()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      })
    }
  }

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AuthenticatedLayout>
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto py-10 px-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Email Templates</h1>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setCurrentTemplate({})}>
                  <Plus className="mr-2 h-4 w-4" /> Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{currentTemplate.id ? "Edit Template" : "New Template"}</DialogTitle>
                  <DialogDescription>
                    Configure the email template content. Use {"{{variable}}"} for dynamic data.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label htmlFor="name" className="text-sm font-medium">Unique Name (Key)</label>
                    <Input
                      id="name"
                      value={currentTemplate.name || ""}
                      onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                      placeholder="e.g. welcome_email"
                      disabled={!!currentTemplate.id} // Prevent renaming key to avoid breaking code
                    />
                    <p className="text-xs text-muted-foreground">Used by the system to identify this template.</p>
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="subject" className="text-sm font-medium">Subject</label>
                    <Input
                      id="subject"
                      value={currentTemplate.subject || ""}
                      onChange={(e) => setCurrentTemplate({ ...currentTemplate, subject: e.target.value })}
                      placeholder="Welcome to our platform!"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="description" className="text-sm font-medium">Description</label>
                    <Input
                      id="description"
                      value={currentTemplate.description || ""}
                      onChange={(e) => setCurrentTemplate({ ...currentTemplate, description: e.target.value })}
                      placeholder="Internal description..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="body_html" className="text-sm font-medium">HTML Body</label>
                    <Textarea
                      id="body_html"
                      value={currentTemplate.body_html || ""}
                      onChange={(e) => setCurrentTemplate({ ...currentTemplate, body_html: e.target.value })}
                      className="font-mono min-h-[150px]"
                      placeholder="<html>...</html>"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="body_text" className="text-sm font-medium">Text Body</label>
                    <Textarea
                      id="body_text"
                      value={currentTemplate.body_text || ""}
                      onChange={(e) => setCurrentTemplate({ ...currentTemplate, body_text: e.target.value })}
                      className="font-mono min-h-[100px]"
                      placeholder="Plain text version..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex items-center mb-4">
            <Search className="w-4 h-4 mr-2 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              className="max-w-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="rounded-md border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No templates found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>{template.subject}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{template.description}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(template.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setCurrentTemplate(template)
                              setIsDialogOpen(true)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the template "{template.name}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(template.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}

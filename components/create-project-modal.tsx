"use client"

import * as React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, ChevronRight, ChevronDown } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface Project {
  id: string
  name: string
  emoji?: string
  description?: string
}

interface CreateProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectCreated?: () => void
  project?: Project | null
}

const TAGS = [
  { label: "Investment", icon: "💰" },
  { label: "Homework", icon: "📖" },
  { label: "Writing", icon: "✍️" },
  { label: "Health", icon: "❤️" },
  { label: "Travel", icon: "🧳" },
]

export default function CreateProjectModal({ open, onOpenChange, onProjectCreated, project }: CreateProjectModalProps) {
  const { accessToken } = useAuth()
  const [name, setName] = useState("")
  const [emoji, setEmoji] = useState("") // Empty means show +
  const [loading, setLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [description, setDescription] = useState("")

  React.useEffect(() => {
    if (project) {
      setName(project.name)
      setEmoji(project.emoji || "")
      setDescription(project.description || "")
      setShowAdvanced(!!project.description)
    } else {
      setName("")
      setEmoji("")
      setDescription("")
      setShowAdvanced(false)
    }
  }, [project, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const url = project ? `/api/projects/${project.id}` : "/api/projects"
      const method = project ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name,
          emoji: emoji || "📁", // Default to folder if empty
          description
        }),
      })

      if (res.ok) {
        onOpenChange(false)
        if (!project) {
          setName("")
          setEmoji("")
          setDescription("")
        }
        if (onProjectCreated) onProjectCreated()
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{project ? "Edit Project" : "New Project"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex gap-3">
            <button
              type="button"
              className="w-12 h-12 rounded-full border border-dashed border-gray-300 flex items-center justify-center hover:bg-muted/50 transition-colors shrink-0 text-xl"
              onClick={() => setEmoji(emoji ? "" : "📁")}
              title="Add icon"
            >
              {emoji || <Plus className="w-5 h-5 text-muted-foreground" />}
            </button>
            <Input 
              placeholder="Project Name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 text-lg px-4"
              autoFocus
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {TAGS.map((tag) => (
              <button
                key={tag.label}
                type="button"
                onClick={() => {
                  setName(tag.label)
                  setEmoji(tag.icon)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium hover:bg-muted transition-colors"
              >
                <span>{tag.icon}</span>
                <span>{tag.label}</span>
              </button>
            ))}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors"
            >
              Advanced Settings
              {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            {showAdvanced && (
              <div className="mt-3">
                 <Input 
                  placeholder="Description (optional)" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="mr-2">
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || loading} className="rounded-full px-6">
              {loading ? "Creating..." : "Create project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

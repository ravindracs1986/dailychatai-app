
"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Trash2, Copy, Check } from "lucide-react"

interface ApiKey {
  id: string
  name: string
  last_used_at: string | null
  created_at: string
}

export function ApiKeyManager() {
  const { accessToken } = useAuth()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (accessToken) {
      fetchKeys()
    }
  }, [accessToken])

  const fetchKeys = async () => {
    if (!accessToken) return
    try {
      const res = await fetch("/api/keys", {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (!res.ok) throw new Error("Failed to fetch keys")
      const data = await res.json()
      setKeys(data.keys || [])
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to load API keys",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateKey = async () => {
    if (!newKeyName.trim() || !accessToken) return

    setIsCreating(true)
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ name: newKeyName }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to create key")
      }

      setCreatedKey(data.key.key)
      setKeys([data.key, ...keys])
      setNewKeyName("")
      toast({
        title: "Success",
        description: "API key created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create key",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteKey = async (id: string) => {
    if (!accessToken) return
    try {
      const res = await fetch(`/api/keys/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      
      if (!res.ok) throw new Error("Failed to delete key")

      setKeys(keys.filter(k => k.id !== id))
      toast({
        title: "Success",
        description: "API key deleted",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete key",
        variant: "destructive",
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">API Keys</h3>
          <p className="text-sm text-muted-foreground">
            Manage your API keys for external tools like TabbyML and Continue.dev
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) setCreatedKey(null)
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create New Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                API keys allow external applications to access your account.
              </DialogDescription>
            </DialogHeader>

            {!createdKey ? (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Key Name</Label>
                  <Input 
                    placeholder="e.g. VS Code Extension" 
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateKey} disabled={!newKeyName.trim() || isCreating}>
                    {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-md border space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    Save this key now. You won't be able to see it again!
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-background p-2 rounded border font-mono text-sm break-all">
                      {createdKey}
                    </code>
                    <Button size="icon" variant="ghost" onClick={() => copyToClipboard(createdKey)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => setIsDialogOpen(false)}>Done</Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : keys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No API keys found
                </TableCell>
              </TableRow>
            ) : (
              keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell>{new Date(key.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {key.last_used_at 
                      ? new Date(key.last_used_at).toLocaleDateString() 
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteKey(key.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import AuthenticatedLayout from "@/components/authenticated-layout"
import { Button } from "@/components/ui/button"
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Package, Plus, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface Plan {
  id: string
  name: string
  price: number | null
  messages_per_day: number | null
  model: string | null
  features: any
}

export default function AdminPlansPage() {
  const { accessToken } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    messages_per_day: "",
    model: "",
    features: "{}",
  })

  useEffect(() => {
    fetchPlans()
  }, [accessToken])

  const fetchPlans = async () => {
    if (!accessToken) return
    try {
      const res = await fetch("/api/admin/plans", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const data = await res.json()
        setPlans(data.plans)
      }
    } catch (err) {
      console.error("Failed to fetch plans", err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (plan?: Plan) => {
    setError("")
    if (plan) {
      setEditingPlan(plan)
      setFormData({
        name: plan.name,
        price: plan.price?.toString() || "",
        messages_per_day: plan.messages_per_day?.toString() || "",
        model: plan.model || "",
        features: JSON.stringify(plan.features, null, 2),
      })
    } else {
      setEditingPlan(null)
      setFormData({
        name: "",
        price: "",
        messages_per_day: "",
        model: "",
        features: JSON.stringify({
          description: "",
          included: [],
          excluded: [],
          support: "community"
        }, null, 2),
      })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    setError("")
    setSaving(true)

    try {
      // Validate JSON
      let featuresParsed
      try {
        featuresParsed = JSON.parse(formData.features)
      } catch (e) {
        throw new Error("Invalid JSON in Features field")
      }

      const payload = {
        name: formData.name,
        price: formData.price ? parseFloat(formData.price) : null,
        messages_per_day: formData.messages_per_day ? parseInt(formData.messages_per_day) : null,
        model: formData.model || null,
        features: JSON.stringify(featuresParsed),
      }

      const url = editingPlan
        ? `/api/admin/plans/${editingPlan.id}`
        : "/api/admin/plans"
      
      const method = editingPlan ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error("Failed to save plan")
      }

      setIsDialogOpen(false)
      fetchPlans()
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return

    try {
      const res = await fetch(`/api/admin/plans/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        fetchPlans()
      } else {
        alert("Failed to delete plan")
      }
    } catch (err) {
      console.error(err)
      alert("Error deleting plan")
    }
  }

  return (
    <AuthenticatedLayout>
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto py-10 px-4 max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Subscription Plans</h1>
                <p className="text-muted-foreground mt-1">
                  Manage pricing tiers and feature limits
                </p>
              </div>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Plan
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Messages/Day</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : plans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No plans found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    plans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell>
                          {plan.price === 0 || plan.price === null 
                            ? "Free" 
                            : `$${plan.price}`}
                        </TableCell>
                        <TableCell>
                          {plan.messages_per_day === null 
                            ? "Unlimited" 
                            : plan.messages_per_day}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {plan.model || "Default"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(plan)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(plan.id)} className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Create Plan"}</DialogTitle>
          </DialogHeader>
          
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Plan Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Pro"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Price (Monthly)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0 for Free"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="messages">Messages Per Day</Label>
                <Input
                  id="messages"
                  type="number"
                  value={formData.messages_per_day}
                  onChange={(e) => setFormData({ ...formData, messages_per_day: e.target.value })}
                  placeholder="Leave empty for unlimited"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="model">Model ID</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g. openai/gpt-4"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="features">Features (JSON)</Label>
              <Textarea
                id="features"
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                className="font-mono text-xs h-40"
                placeholder='{"description": "...", "included": ["..."]}'
              />
              <p className="text-xs text-muted-foreground">
                Must be valid JSON. Supported keys: description, included (array), excluded (array), support.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  )
}

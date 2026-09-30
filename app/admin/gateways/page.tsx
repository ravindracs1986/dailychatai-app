"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Settings, CreditCard, Check, X, Banknote } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import AuthenticatedLayout from "@/components/authenticated-layout"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

interface Gateway {
  id: string
  name: string
  title: string
  description: string
  is_active: boolean
  config: any
}

export default function AdminGatewaysPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [gateways, setGateways] = useState<Gateway[]>([])
  const [loading, setLoading] = useState(true)
  const [editingGateway, setEditingGateway] = useState<Gateway | null>(null)
  const [saving, setSaving] = useState(false)

  // Form states
  const [formData, setFormData] = useState<any>({})

  useEffect(() => {
    fetchGateways()
  }, [])

  const fetchGateways = async () => {
    try {
      const res = await fetch("/api/admin/gateways", {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_access_token")}` },
      })
      if (res.ok) {
        const data = await res.json()
        setGateways(data.gateways)
      }
    } catch (error) {
      console.error("Failed to fetch gateways", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (gateway: Gateway) => {
    setEditingGateway(gateway)
    let config = gateway.config
    if (typeof config === 'string') {
        try { config = JSON.parse(config) } catch(e) {}
    }
    setFormData({
        title: gateway.title,
        description: gateway.description,
        is_active: gateway.is_active,
        config: config || {}
    })
  }

  const handleSave = async () => {
    if (!editingGateway) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/gateways/${editingGateway.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_access_token")}`,
        },
        body: JSON.stringify({
            is_active: formData.is_active,
            title: formData.title,
            description: formData.description,
            config: formData.config
        }),
      })
      
      if (res.ok) {
        toast({ title: "Success", description: "Gateway updated successfully" })
        setEditingGateway(null)
        fetchGateways()
      } else {
        const data = await res.json()
        toast({ title: "Error", description: data.error || "Failed to update", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const updateConfig = (key: string, value: string) => {
      setFormData({
          ...formData,
          config: {
              ...formData.config,
              [key]: value
          }
      })
  }

  if (loading) {
      return (
          <AuthenticatedLayout>
              <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin" />
              </div>
          </AuthenticatedLayout>
      )
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto py-8 max-w-5xl">
        <h1 className="text-3xl font-bold mb-8">Payment Gateways</h1>
        
        <div className="grid gap-6">
            {gateways.map(gateway => (
                <Card key={gateway.id}>
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-muted rounded-lg">
                                {gateway.name === 'stripe' ? <CreditCard className="w-6 h-6" /> : 
                                 gateway.name === 'paypal' ? <span className="font-bold text-lg">PP</span> :
                                 <Banknote className="w-6 h-6" />}
                            </div>
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    {gateway.title}
                                    {gateway.is_active ? 
                                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">Active</Badge> : 
                                        <Badge variant="secondary">Inactive</Badge>
                                    }
                                </CardTitle>
                                <CardDescription>{gateway.description}</CardDescription>
                            </div>
                        </div>
                        <Button variant="outline" onClick={() => handleEdit(gateway)}>
                            <Settings className="w-4 h-4 mr-2" />
                            Configure
                        </Button>
                    </CardHeader>
                </Card>
            ))}
        </div>

        <Dialog open={!!editingGateway} onOpenChange={(open) => !open && setEditingGateway(null)}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Configure {editingGateway?.name}</DialogTitle>
                    <DialogDescription>
                        Update settings and credentials for this payment gateway.
                    </DialogDescription>
                </DialogHeader>

                {editingGateway && (
                    <div className="grid gap-4 py-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-0.5">
                                <Label className="text-base">Enable Gateway</Label>
                                <div className="text-sm text-muted-foreground">
                                    Activate this payment method for users
                                </div>
                            </div>
                            <Switch 
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Display Title</Label>
                            <Input 
                                value={formData.title} 
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Description</Label>
                            <Input 
                                value={formData.description} 
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                            />
                        </div>

                        <div className="border-t my-2 pt-4">
                            <h4 className="font-medium mb-4">Credentials & Config</h4>
                            
                            {editingGateway.name === 'stripe' && (
                                <div className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label>Secret Key (sk_...)</Label>
                                        <Input 
                                            type="password"
                                            value={formData.config.secret_key || ''}
                                            onChange={(e) => updateConfig('secret_key', e.target.value)}
                                            placeholder="sk_test_..."
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Publishable Key (pk_...)</Label>
                                        <Input 
                                            value={formData.config.publishable_key || ''}
                                            onChange={(e) => updateConfig('publishable_key', e.target.value)}
                                            placeholder="pk_test_..."
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Webhook Secret (whsec_...)</Label>
                                        <Input 
                                            type="password"
                                            value={formData.config.webhook_secret || ''}
                                            onChange={(e) => updateConfig('webhook_secret', e.target.value)}
                                            placeholder="whsec_..."
                                        />
                                    </div>
                                </div>
                            )}

                            {editingGateway.name === 'paypal' && (
                                <div className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label>Client ID</Label>
                                        <Input 
                                            value={formData.config.client_id || ''}
                                            onChange={(e) => updateConfig('client_id', e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Client Secret</Label>
                                        <Input 
                                            type="password"
                                            value={formData.config.client_secret || ''}
                                            onChange={(e) => updateConfig('client_secret', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Switch 
                                            checked={formData.config.mode === 'sandbox'}
                                            onCheckedChange={(c) => updateConfig('mode', c ? 'sandbox' : 'live')}
                                        />
                                        <Label>Sandbox Mode</Label>
                                    </div>
                                </div>
                            )}

                            {editingGateway.name === 'manual' && (
                                <div className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label>Bank/Transfer Instructions</Label>
                                        <Textarea 
                                            value={formData.config.instructions || ''}
                                            onChange={(e) => updateConfig('instructions', e.target.value)}
                                            rows={5}
                                            placeholder="Bank Name: ...&#10;Account Number: ..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingGateway(null)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  )
}

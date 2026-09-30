"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Check, X, Zap, Loader2, CreditCard, ArrowLeft, Banknote } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { getStoredAccessToken } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export interface PlanFromApi {
  id: string
  name: string
  price: number | null
  messages_per_day: number | null
  model: string | null
  features: {
    description?: string
    included?: string[]
    excluded?: string[]
    support?: string
  } | null
}

const planLabelMap: Record<string, string> = {
  Free: "FREE",
  Pro: "INDIVIDUALS",
  Enterprise: "TEAMS",
}

interface UpgradePlansModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefillPlanId?: string | null
  startAtCheckout?: boolean
}

export default function UpgradePlansModal({
  open,
  onOpenChange,
  prefillPlanId,
  startAtCheckout,
}: UpgradePlansModalProps) {
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()
  const [plans, setPlans] = useState<PlanFromApi[]>([])
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null)
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">("annually")

  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [showPaymentSelection, setShowPaymentSelection] = useState(false)
  const [manualPaymentStep, setManualPaymentStep] = useState(false)
  const [selectedGateway, setSelectedGateway] = useState<any>(null)
  const [referenceId, setReferenceId] = useState("")
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null)
  const [autoCheckoutDone, setAutoCheckoutDone] = useState(false)

  const discountPercent = Number(process.env.SITE_DISCOUNT) || 30
  const shouldAutoCheckout = !!startAtCheckout && !!prefillPlanId

  useEffect(() => {
    if (!open) return
    fetch("/api/plans")
      .then((res) => res.json())
      .then((data) => setPlans(data.plans || []))
      .catch(() => setPlans([]))

    fetch("/api/payment/methods")
      .then((res) => res.json())
      .then((data) => setPaymentMethods(data.methods || []))
      .catch(() => setPaymentMethods([]))
  }, [open])

  useEffect(() => {
    if (!open || !user) return
    const token = getStoredAccessToken()
    if (!token) {
      setCurrentPlanId(user.plan_id || null)
      return
    }
    fetch("/api/subscriptions/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setCurrentPlanId(data.currentPlanId || data.plan?.id || user.plan_id || null))
      .catch(() => setCurrentPlanId(user.plan_id || null))
  }, [open, user])

  useEffect(() => {
    if (!open) {
        setShowPaymentSelection(false)
        setManualPaymentStep(false)
        setSelectedGateway(null)
        setReferenceId("")
        setProofFile(null)
        setUploadingProof(false)
        setSelectedPlanId(null)
        setProcessingPaymentId(null)
        setAutoCheckoutDone(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (!startAtCheckout) return
    if (!prefillPlanId) return
    if (autoCheckoutDone) return
    if (plans.length === 0) return

    const plan = plans.find((p) => p.id === prefillPlanId)
    if (!plan) {
      setAutoCheckoutDone(true)
      toast({
        title: "Plan not found",
        description: "Please choose a plan to continue.",
        variant: "destructive",
      })
      return
    }

    setAutoCheckoutDone(true)
    if (plan.price === 0 || plan.price == null) {
      handleSubscribe(plan.id)
      return
    }
    setSelectedPlanId(plan.id)
    setShowPaymentSelection(true)
  }, [autoCheckoutDone, open, plans, prefillPlanId, startAtCheckout])

  const handleSelectPlan = (planId: string, price: number | null) => {
    if (price === 0 || price === null) {
        handleSubscribe(planId)
    } else {
        setSelectedPlanId(planId)
        setShowPaymentSelection(true)
    }
  }

  const handleSubscribe = async (planId: string, gatewayId?: string) => {
    const token = getStoredAccessToken()
    if (!token) return
    
    if (gatewayId) {
        const gateway = paymentMethods.find(m => m.id === gatewayId)
        if (gateway && gateway.name === 'manual') {
            setSelectedGateway(gateway)
            setManualPaymentStep(true)
            return
        }
        setProcessingPaymentId(gatewayId)
    } else {
        setSubscribingPlanId(planId)
    }

    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
            plan_id: planId,
            gateway_id: gatewayId,
            billing_cycle: billingCycle 
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error || "Subscribe failed")

      if (data.url) {
          window.location.href = data.url
          return
      }

      if (data.message) {
          toast({
              title: "Success",
              description: data.message,
          })
      }

      await refreshUser()
      onOpenChange(false)
    } catch (err: any) {
      console.error(err)
      toast({
          title: "Error",
          description: err.message || "Something went wrong",
          variant: "destructive"
      })
    } finally {
      setSubscribingPlanId(null)
      setProcessingPaymentId(null)
    }
  }

  const displayPrice = (price: number | null, planName: string) => {
    if (price == null) return "Custom"
    if (price === 0) return "$0"
    if (billingCycle === "annually" && planName !== "Free") {
      const multiplier = 1 - discountPercent / 100
      const annual = Math.round(price * 12 * multiplier * 100) / 100
      return `$${annual.toFixed(2)}`
    }
    return `$${Number(price).toFixed(2)}`
  }

  const handleSubmitManualPayment = async () => {
      if (!selectedPlanId || !selectedGateway) return
      
      try {
          let proofUrl = ""
          if (proofFile) {
              setUploadingProof(true)
              const formData = new FormData()
              formData.append("file", proofFile)
              
              const uploadRes = await fetch("/api/upload/payment-proof", {
                  method: "POST",
                  body: formData,
                  headers: {
                      Authorization: `Bearer ${getStoredAccessToken()}`
                  }
              })
              
              if (!uploadRes.ok) throw new Error("Failed to upload proof")
              const uploadData = await uploadRes.json()
              proofUrl = uploadData.url
          }

          const token = getStoredAccessToken()
          const res = await fetch("/api/subscriptions", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ 
                  plan_id: selectedPlanId,
                  gateway_id: selectedGateway.id,
                  billing_cycle: billingCycle,
                  metadata: {
                      reference_id: referenceId,
                      proof_url: proofUrl
                  }
              }),
          })

          const data = await res.json()
          if (!res.ok) throw new Error(data.error || "Submission failed")

          toast({
              title: "Success",
              description: "Payment submitted for approval. We will notify you once verified.",
          })
          onOpenChange(false)
      } catch (err: any) {
          toast({
              title: "Error",
              description: err.message || "Something went wrong",
              variant: "destructive"
          })
      } finally {
          setUploadingProof(false)
      }
  }

  const renderManualPaymentStep = () => {
      const plan = plans.find(p => p.id === selectedPlanId)
      if (!plan || !selectedGateway) return null
      
      let config = selectedGateway.config || {}
      if (typeof config === 'string') {
          try { config = JSON.parse(config) } catch(e) {}
      }
      const instructions = config.instructions || "Please contact support for bank details."

      return (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setManualPaymentStep(false)} className="p-0 h-auto hover:bg-transparent">
              <ArrowLeft className="w-5 h-5 mr-1" /> Back
            </Button>
            <h3 className="text-xl font-bold">Manual Transfer Details</h3>
          </div>

          <div className="bg-muted p-4 rounded-lg border whitespace-pre-wrap font-mono text-sm">
            {instructions}
          </div>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Transaction Reference ID</Label>
              <Input 
                placeholder="Enter bank transaction ID"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Upload Payment Proof (Screenshot/Receipt)</Label>
              <Input 
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">Optional but recommended for faster processing.</p>
            </div>
          </div>

          <Button className="w-full" onClick={handleSubmitManualPayment} disabled={uploadingProof || !referenceId}>
            {uploadingProof && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Payment
          </Button>
        </div>
      )
  }

  const renderPaymentSelection = () => {
      const plan = plans.find(p => p.id === selectedPlanId)
      if (!plan) return null

      return (
          <div className="space-y-6">
              <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowPaymentSelection(false)} className="p-0 h-auto hover:bg-transparent">
                      <ArrowLeft className="w-5 h-5 mr-1" /> Back
                  </Button>
                  <h3 className="text-xl font-bold">Checkout</h3>
              </div>

              <div className="bg-muted/30 p-4 rounded-lg border">
                  <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{plan.name} Plan</span>
                      <span className="font-bold text-lg">{displayPrice(plan.price, plan.name)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">Billed {billingCycle}</div>
                    <select
                      value={billingCycle}
                      onChange={(e) => setBillingCycle(e.target.value as "monthly" | "annually")}
                      className="text-sm border rounded-md px-2 py-1.5 bg-background"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="annually">Annually</option>
                    </select>
                  </div>
              </div>

              <div className="space-y-4">
                  <h4 className="font-medium">Select Payment Method</h4>
                  <div className="grid gap-3">
                      {paymentMethods.length === 0 && (
                          <div className="text-sm text-muted-foreground">No payment methods available. Please contact support.</div>
                      )}
                      {paymentMethods.map((method) => (
                          <Button
                            key={method.id}
                            variant="outline"
                            className="h-auto p-4 justify-start gap-4 hover:bg-accent hover:text-accent-foreground"
                            onClick={() => handleSubscribe(plan.id, method.id)}
                            disabled={processingPaymentId !== null}
                          >
                              {method.name === 'stripe' ? <CreditCard className="w-6 h-6" /> : 
                               method.name === 'paypal' ? <span className="font-bold text-lg italic text-blue-600">Pay<span className="text-blue-400">Pal</span></span> :
                               <Banknote className="w-6 h-6" />}
                              <div className="flex flex-col items-start">
                                  <span className="font-medium">{method.title}</span>
                                  <span className="text-xs text-muted-foreground font-normal">{method.description}</span>
                              </div>
                              {processingPaymentId === method.id && (
                                  <Loader2 className="w-4 h-4 animate-spin ml-auto" />
                              )}
                          </Button>
                      ))}
                  </div>
              </div>
          </div>
      )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-full max-h-[90vh] h-full md:h-auto overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold">{shouldAutoCheckout ? "Renew Plan" : "Upgrade Plans"}</DialogTitle>
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        {manualPaymentStep ? (
          renderManualPaymentStep()
        ) : showPaymentSelection ? (
          renderPaymentSelection()
        ) : shouldAutoCheckout && !autoCheckoutDone ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
            <>
                <p className="text-sm text-muted-foreground mt-1">
                Looking to find out what an upgrade you can get?{" "}
                <a href="/community" className="text-primary underline hover:no-underline">
                    More details
                </a>
                </p>
                <div className="flex items-center justify-end gap-2 mt-2">
                <span className={`text-sm text-muted-foreground`}>Save {discountPercent}% with annual</span>
                <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as "monthly" | "annually")}
                    className="text-sm border rounded-md px-2 py-1.5 bg-background"
                >
                    <option value="annually">Annually</option>
                    <option value="monthly">Monthly</option>
                </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {plans.map((plan) => {
                    const isFreePlan = plan.price === 0 || plan.name === "Free"
                    const isCurrent =
                    currentPlanId === plan.id || (isFreePlan && (currentPlanId == null || currentPlanId === ""))
                    const isFree = plan.price === 0 || plan.price == null
                    const label = planLabelMap[plan.name] || plan.name.toUpperCase()
                    const description =
                    (plan.features as { description?: string } | null)?.description ||
                    `Plan: ${plan.name}`
                    const included =
                    (plan.features as { included?: string[] } | null)?.included || []
                    const excluded =
                    (plan.features as { excluded?: string[] } | null)?.excluded || []
                    const isRecommended = plan.name === "Pro"

                    return (
                    <div
                        key={plan.id}
                        className={`rounded-xl border-2 bg-card p-5 flex flex-col ${
                        isRecommended
                            ? "border-primary/50 ring-2 ring-primary/20 shadow-lg"
                            : "border-border"
                        }`}
                    >
                        <div className="flex flex-col mb-1">
                        <div className="flex items-center justify-between mb-2">
                            <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                isFree
                                ? "bg-muted text-muted-foreground"
                                : isRecommended
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground"
                            }`}
                            >
                            {label}
                            </span>
                        </div>
                        <span className="text-3xl font-bold">
                            {displayPrice(plan.price, plan.name)}
                        </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 min-h-[40px]">{description}</p>
                        <ul className="space-y-2 flex-1 mb-6">
                        {included.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
                            <span>{item}</span>
                            </li>
                        ))}
                        {excluded.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <X className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                            <span>{item}</span>
                            </li>
                        ))}
                        </ul>
                        {isCurrent ? (
                        <Button variant="secondary" className="w-full" disabled>
                            Current Plan
                        </Button>
                        ) : (
                        <Button
                            className={`w-full gap-1.5 ${isRecommended ? "bg-primary" : ""}`}
                            onClick={() => handleSelectPlan(plan.id, plan.price)}
                            disabled={subscribingPlanId !== null}
                        >
                            {subscribingPlanId === plan.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                            <Zap className="w-4 h-4" />
                            )}
                            Upgrade
                        </Button>
                        )}
                    </div>
                    )
                })}
                </div>
            </>
        )}
      </DialogContent>
    </Dialog>
  )
}

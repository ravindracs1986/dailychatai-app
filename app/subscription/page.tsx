"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import AuthenticatedLayout from "@/components/authenticated-layout"
import { Loader2, Zap, Check, MessageSquare, Calendar, CreditCard } from "lucide-react"
import UpgradePlansModal from "@/components/upgrade-plans-modal"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

interface Plan {
  id: string
  name: string
  price: number | null
  messages_per_day: number | null
  model: string | null
  features: any
}

interface Subscription {
  id: string
  status: string
  current_period_start: string | null
  current_period_end: string | null
  is_expired?: boolean
}

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [renewModalOpen, setRenewModalOpen] = useState(false)
  const [messagesToday, setMessagesToday] = useState<number>(0)
  const [messagesLimit, setMessagesLimit] = useState<number | null>(null)

  useEffect(() => {
    fetchSubscription()
  }, [])

  const fetchSubscription = async () => {
    try {
      const token = localStorage.getItem("auth_access_token")
      if (!token) return

      const res = await fetch("/api/subscriptions/me", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setPlan(data.plan)
        setSubscription(data.subscription)
      }

      const usageRes = await fetch("/api/usage", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (usageRes.ok) {
        const u = await usageRes.json()
        setMessagesToday(Number(u?.usage?.messages_today ?? u?.usage_today ?? 0))
        setMessagesLimit(u?.plan?.messages_per_day ?? u?.usage_limit ?? null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const usagePercentage = messagesLimit
    ? Math.min(100, (messagesToday / messagesLimit) * 100)
    : 0
  const limitReached = messagesLimit != null && messagesToday >= messagesLimit

  return (
    <AuthenticatedLayout>
      <div className="h-full overflow-y-auto bg-muted/10">
        <div className="container mx-auto py-10 px-4 max-w-5xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Subscription</h1>
              <p className="text-muted-foreground mt-1">Manage your plan and usage limits</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Current Plan Card */}
              <Card className="md:col-span-2 lg:col-span-1 border-primary/20 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Current Plan
                  </CardTitle>
                  <CardDescription>
                    You are currently on the <span className="font-semibold text-foreground">{plan?.name || "Free"}</span> plan
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!!subscription?.is_expired && (
                    <div className="text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                      Your subscription has expired. Please renew to continue using chat.
                    </div>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      {plan?.price === 0 || !plan?.price ? "Free" : `$${plan.price}`}
                    </span>
                    {plan?.price !== 0 && plan?.price && (
                      <span className="text-muted-foreground">/month</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Included Features</div>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>{plan?.messages_per_day ? `${plan.messages_per_day} messages per day` : "Unlimited messages"}</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Access to {plan?.model ? plan.model.split('/').pop() : "Standard"} models</span>
                      </li>
                      {plan?.features?.support && (
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>{plan.features.support} support</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Start: {formatDate(subscription?.current_period_start ?? null)}</span>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                      <span>End: {formatDate(subscription?.current_period_end ?? null)}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <Button
                      className="w-full gap-2"
                      onClick={() => setUpgradeModalOpen(true)}
                      variant={plan?.name === "Free" ? "default" : "outline"}
                    >
                      <Zap className="w-4 h-4" />
                      {plan?.name === "Free" ? "Upgrade Plan" : "Change Plan"}
                    </Button>
                    <Button
                      className="w-full gap-2"
                      onClick={() => setRenewModalOpen(true)}
                      disabled={!subscription?.is_expired || !plan?.id || plan?.name === "Free"}
                    >
                      <CreditCard className="w-4 h-4" />
                      Renew Plan
                    </Button>
                  </div>
                </CardFooter>
              </Card>

              {/* Usage Card */}
              <Card className="md:col-span-2 lg:col-span-1 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    Usage
                  </CardTitle>
                  <CardDescription>
                    Your daily message usage
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Messages Today</span>
                      <span className="text-muted-foreground">
                        {messagesToday} / {messagesLimit ?? "∞"}
                      </span>
                    </div>
                    <Progress value={usagePercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Resets daily at midnight UTC
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Plan Limits</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">Daily Limit</div>
                        <div className="font-semibold">
                          {messagesLimit ?? "Unlimited"}
                        </div>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">Model Access</div>
                        <div className="font-semibold truncate">
                          {plan?.model ? plan.model.split('/').pop() : "Standard"}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  {limitReached ? (
                    <div className="text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg w-full text-center">
                      Daily message limit reached. Resets at midnight UTC.
                    </div>
                  ) : usagePercentage >= 80 ? (
                    <div className="text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg w-full text-center">
                      Running low on messages today.
                    </div>
                  ) : null}
                </CardFooter>
              </Card>
            </div>
          )}
        </div>
      </div>

      <UpgradePlansModal 
        open={upgradeModalOpen} 
        onOpenChange={setUpgradeModalOpen} 
      />
      <UpgradePlansModal
        open={renewModalOpen}
        onOpenChange={setRenewModalOpen}
        prefillPlanId={plan?.id ?? null}
        startAtCheckout
      />
    </AuthenticatedLayout>
  )
}

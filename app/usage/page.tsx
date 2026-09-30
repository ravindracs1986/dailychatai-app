"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import AuthenticatedLayout from "@/components/authenticated-layout"
import { ExternalLink, Loader2, MessageSquare, Calendar, FileText, ChevronLeft, ChevronRight, Download } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

export default function UsagePage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [planName, setPlanName] = useState("Free")
  const [messagesPerDay, setMessagesPerDay] = useState<number | null>(null)
  const [burstPerMinute, setBurstPerMinute] = useState<number | null>(null)
  const [messagesToday, setMessagesToday] = useState<number>(0)
  const [messagesRemainingToday, setMessagesRemainingToday] = useState<number | null>(null)
  const [periodStart, setPeriodStart] = useState<string | null>(null)
  const [periodEnd, setPeriodEnd] = useState<string | null>(null)
  const [dailyUsage, setDailyUsage] = useState<any[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [dailyUsagePage, setDailyUsagePage] = useState(1)
  const [conversationsPage, setConversationsPage] = useState(1)
  const [invoices, setInvoices] = useState<any[]>([])
  const [invoiceTotal, setInvoiceTotal] = useState(0)
  const [invoicePage, setInvoicePage] = useState(1)
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const INVOICE_LIMIT = 5
  const DAILY_USAGE_LIMIT = 5
  const CONVERSATIONS_LIMIT = 10
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    })
  }

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setInvoicesLoading(true)
        const token = localStorage.getItem("auth_access_token")
        if (!token) return

        const res = await fetch(`/api/transactions/me?page=${invoicePage}&limit=${INVOICE_LIMIT}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setInvoices(data.transactions || [])
          setInvoiceTotal(data.total || 0)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setInvoicesLoading(false)
      }
    }
    fetchInvoices()
  }, [invoicePage])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("auth_access_token")
        if (!token) return

        // Fetch Subscription
        const subRes = await fetch("/api/subscriptions/me", {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (subRes.ok) {
          const data = await subRes.json()
          setPlanName(data.plan?.name || "Free")
          setPeriodStart(data.subscription?.current_period_start ?? null)
          setPeriodEnd(data.subscription?.current_period_end ?? null)
        }

        // Fetch Usage (plan quota + remaining)
        const usageNowRes = await fetch("/api/usage", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (usageNowRes.ok) {
          const u = await usageNowRes.json()
          setMessagesPerDay(u?.plan?.messages_per_day ?? null)
          setBurstPerMinute(u?.plan?.chat_burst_per_minute ?? null)
          setMessagesToday(Number(u?.usage?.messages_today ?? 0))
          setMessagesRemainingToday(
            u?.usage?.messages_remaining_today == null ? null : Number(u.usage.messages_remaining_today)
          )
        }

        // Fetch Usage History
        const usageRes = await fetch("/api/usage/history", {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (usageRes.ok) {
          const data = await usageRes.json()
          setDailyUsage(data.dailyUsage || [])
          setConversations(data.conversations || [])
          setDailyUsagePage(1)
          setConversationsPage(1)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const dailyUsageTotalPages = Math.max(1, Math.ceil(dailyUsage.length / DAILY_USAGE_LIMIT))
  const conversationsTotalPages = Math.max(1, Math.ceil(conversations.length / CONVERSATIONS_LIMIT))

  const dailyUsageSlice = dailyUsage.slice(
    (dailyUsagePage - 1) * DAILY_USAGE_LIMIT,
    dailyUsagePage * DAILY_USAGE_LIMIT
  )
  const conversationsSlice = conversations.slice(
    (conversationsPage - 1) * CONVERSATIONS_LIMIT,
    conversationsPage * CONVERSATIONS_LIMIT
  )

  useEffect(() => {
    setDailyUsagePage((p) => Math.min(p, dailyUsageTotalPages))
  }, [dailyUsageTotalPages])

  useEffect(() => {
    setConversationsPage((p) => Math.min(p, conversationsTotalPages))
  }, [conversationsTotalPages])

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      setDownloadingId(invoiceId)
      const token = localStorage.getItem("auth_access_token")
      if (!token) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must be logged in to download invoices.",
        })
        return
      }

      const res = await fetch(`/api/transactions/${invoiceId}/invoice`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || "Failed to download invoice")
      }

      const contentType = res.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
         const error = await res.json().catch(() => ({}))
         throw new Error(error.error || "Server returned JSON instead of PDF")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${invoiceId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

    } catch (error) {
      console.error("Download error:", error)
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Could not download invoice",
      })
    } finally {
      setDownloadingId(null)
    }
  }

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto py-10 px-4 max-w-5xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <h1 className="text-3xl font-bold">Billing & Invoices</h1>
            
          </div>

          <div className="space-y-6">
            {/* Included Usage Card */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Included Usage</CardTitle>
                <CardDescription>
                  {formatDate(periodStart)} - {formatDate(periodEnd)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-transparent font-medium border-none">
                      <TableCell colSpan={2} className="pt-4 pb-2 text-foreground">
                        Included in {planName}
                      </TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-transparent border-border/50">
                      <TableCell className="text-muted-foreground">Messages / day</TableCell>
                      <TableCell className="text-right font-medium">
                        {messagesPerDay == null ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            Unlimited
                          </span>
                        ) : (
                          messagesPerDay.toLocaleString()
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-transparent border-border/50">
                      <TableCell className="text-muted-foreground">Used today</TableCell>
                      <TableCell className="text-right">{messagesToday.toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-transparent border-border/50">
                      <TableCell className="text-muted-foreground">Remaining today</TableCell>
                      <TableCell className="text-right font-medium">
                        {messagesRemainingToday == null ? "Unlimited" : messagesRemainingToday.toLocaleString()}
                      </TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-transparent border-border/50">
                      <TableCell className="text-muted-foreground">Burst / minute</TableCell>
                      <TableCell className="text-right">
                        {burstPerMinute == null ? "Unlimited" : burstPerMinute.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Daily Usage History Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Daily Usage History
                  </CardTitle>
                  <CardDescription className="mt-1.5">
                    Recent activity from daily_usage table
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setDailyUsagePage((p) => Math.max(1, p - 1))}
                    disabled={dailyUsagePage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground min-w-[90px] text-center">
                    Page {dailyUsagePage} of {dailyUsageTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setDailyUsagePage((p) => Math.min(dailyUsageTotalPages, p + 1))}
                    disabled={dailyUsagePage >= dailyUsageTotalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Messages</TableHead>
                      <TableHead className="text-right">Tokens Used</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyUsage.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No usage data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      dailyUsageSlice.map((item, i) => (
                        <TableRow key={i} className="hover:bg-transparent border-border/50">
                          <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">{item.message_count}</TableCell>
                          <TableCell className="text-right">{item.tokens_used.toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Conversations History Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Recent Conversations
                  </CardTitle>
                  <CardDescription className="mt-1.5">
                    Recent chats from conversations table
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setConversationsPage((p) => Math.max(1, p - 1))}
                    disabled={conversationsPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground min-w-[90px] text-center">
                    Page {conversationsPage} of {conversationsTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setConversationsPage((p) => Math.min(conversationsTotalPages, p + 1))}
                    disabled={conversationsPage >= conversationsTotalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Title</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No conversations found
                        </TableCell>
                      </TableRow>
                    ) : (
                      conversationsSlice.map((chat) => (
                        <TableRow key={chat.id} className="hover:bg-transparent border-border/50">
                          <TableCell className="font-medium">{chat.title}</TableCell>
                          <TableCell>{new Date(chat.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(chat.updated_at).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            {chat.is_pinned ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                Pinned
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">Normal</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Invoices Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Invoices
                  </CardTitle>
                  <CardDescription className="mt-1.5">
                    All your completed transactions and invoices
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setInvoicePage(p => Math.max(1, p - 1))}
                    disabled={invoicePage === 1 || invoicesLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                    Page {invoicePage} of {Math.max(1, Math.ceil(invoiceTotal / INVOICE_LIMIT))}
                  </span>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setInvoicePage(p => p + 1)}
                    disabled={invoicePage >= Math.ceil(invoiceTotal / INVOICE_LIMIT) || invoicesLoading}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoicesLoading ? (
                       <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No invoices found
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map((inv) => (
                        <TableRow key={inv.id} className="hover:bg-transparent border-border/50">
                          <TableCell className="font-mono text-xs text-muted-foreground">{inv.id}</TableCell>
                          <TableCell>{new Date(inv.date).toLocaleDateString()}</TableCell>
                          <TableCell>{inv.planName}</TableCell>
                          <TableCell className="text-right font-medium">
                            {inv.currency.toUpperCase()} {Number(inv.amount).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0" 
                              onClick={() => handleDownloadInvoice(inv.id)}
                              disabled={downloadingId === inv.id}
                            >
                               {downloadingId === inv.id ? (
                                 <Loader2 className="h-4 w-4 animate-spin" />
                               ) : (
                                 <Download className="h-4 w-4" />
                               )}
                               <span className="sr-only">Download</span>
                            </Button>
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
      </div>
    </AuthenticatedLayout>
  )
}

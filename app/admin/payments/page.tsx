"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Check, X, ExternalLink, FileText, ChevronLeft, ChevronRight } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import AuthenticatedLayout from "@/components/authenticated-layout"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Transaction {
  id: string
  user_id: string
  user_email: string
  user_name: string
  gateway_id: string
  gateway_name: string
  gateway_title: string
  amount: string
  currency: string
  status: string
  metadata: any
  created_at: string
}

interface PaginationState {
    page: number
    limit: number
    total: number
    totalPages: number
}

export default function AdminPaymentsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  
  const [pagination, setPagination] = useState<PaginationState>({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1
  })

  useEffect(() => {
    fetchTransactions(1)
  }, [])

  const fetchTransactions = async (page: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/payments?page=${page}&limit=${pagination.limit}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_access_token")}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.transactions)
        setPagination(prev => ({ ...prev, ...data.pagination }))
      }
    } catch (error) {
      console.error("Failed to fetch transactions", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
      setProcessingId(id)
      try {
          const res = await fetch(`/api/admin/payments/${id}/${action}`, {
              method: "POST",
              headers: { Authorization: `Bearer ${localStorage.getItem("auth_access_token")}` }
          })
          
          if (res.ok) {
              toast({ title: "Success", description: `Payment ${action}ed successfully` })
              fetchTransactions(pagination.page)
          } else {
              const data = await res.json()
              toast({ title: "Error", description: data.error || "Action failed", variant: "destructive" })
          }
      } catch (error) {
          toast({ title: "Error", description: "Something went wrong", variant: "destructive" })
      } finally {
          setProcessingId(null)
      }
  }

  const parseMetadata = (metadata: any) => {
      if (typeof metadata === 'string') {
          try { return JSON.parse(metadata) } catch(e) { return {} }
      }
      return metadata || {}
  }

  const handlePageChange = (newPage: number) => {
      if (newPage < 1 || newPage > pagination.totalPages) return
      fetchTransactions(newPage)
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto py-8 max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">Payment Approvals</h1>
        
        <Card>
            <CardHeader>
                <CardTitle>Pending Transactions</CardTitle>
                <CardDescription>Review and approve manual payment requests.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading && transactions.length === 0 ? (
                     <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No pending payments found.
                    </div>
                ) : (
                    <>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Proof / Reference</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.map(tx => {
                                const meta = parseMetadata(tx.metadata)
                                return (
                                    <TableRow key={tx.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{tx.user_name}</span>
                                                <span className="text-xs text-muted-foreground">{tx.user_email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{meta.plan_name || 'Plan'}</span>
                                                <span className="text-xs text-muted-foreground capitalize">{meta.billing_cycle}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-bold">
                                            ${tx.amount}
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                {meta.reference_id && (
                                                    <div className="text-sm">Ref: <span className="font-mono">{meta.reference_id}</span></div>
                                                )}
                                                {meta.proof_url && (
                                                    <a 
                                                        href={meta.proof_url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="flex items-center text-primary hover:underline text-sm"
                                                    >
                                                        <FileText className="w-3 h-3 mr-1" /> View Proof <ExternalLink className="w-3 h-3 ml-1" />
                                                    </a>
                                                )}
                                                {!meta.reference_id && !meta.proof_url && (
                                                    <span className="text-muted-foreground text-sm italic">No details</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(tx.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleAction(tx.id, 'reject')}
                                                    disabled={processingId === tx.id}
                                                >
                                                    {processingId === tx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    className="bg-green-600 hover:bg-green-700"
                                                    onClick={() => handleAction(tx.id, 'approve')}
                                                    disabled={processingId === tx.id}
                                                >
                                                    {processingId === tx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>

                    {/* Pagination Controls */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-end space-x-2 py-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page <= 1 || loading}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Button>
                            <div className="text-sm text-muted-foreground">
                                Page {pagination.page} of {pagination.totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page >= pagination.totalPages || loading}
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                    </>
                )}
            </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}

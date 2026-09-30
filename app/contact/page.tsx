"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Navigation from "@/components/navigation"
import ThemeProvider from "@/components/theme-provider"
import { useAuth } from "@/contexts/auth-context"
import { API_CONFIG } from "@/lib/api-config"
import { Mail, MessageSquare, Send } from "lucide-react"

export default function ContactPage() {
  const { user } = useAuth()
  const [theme, setTheme] = useState("light")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(API_CONFIG.STORAGE_KEYS.THEME) || "light"
    setTheme(stored)
    document.documentElement.classList.toggle("dark", stored === "dark")
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setSent(false)
    // Placeholder: in production you would POST to an API or email service
    await new Promise((r) => setTimeout(r, 800))
    setSent(true)
    setName("")
    setEmail("")
    setMessage("")
    setSending(false)
  }

  const handleThemeToggle = () => {
    const next = theme === "light" ? "dark" : "light"
    setTheme(next)
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.THEME, next)
    document.documentElement.classList.toggle("dark", next === "dark")
  }

  return (
    <ThemeProvider theme={theme}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navigation theme={theme} onThemeToggle={handleThemeToggle} user={user} />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-2">Contact</h1>
          <p className="text-muted-foreground text-lg mb-8">
            Get in touch with us. Send a message and we&apos;ll respond as soon as we can.
          </p>

          <Card className="p-6 md:p-8 border-border/50 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Send a message</h2>
                <p className="text-sm text-muted-foreground">We typically reply within 24 hours</p>
              </div>
            </div>

            {sent ? (
              <div className="py-6 text-center">
                <p className="text-green-600 dark:text-green-500 font-medium mb-2">
                  Message sent successfully
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Thank you for reaching out. We&apos;ll get back to you soon.
                </p>
                <Button variant="outline" onClick={() => setSent(false)}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={5}
                    className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    placeholder="Your message..."
                  />
                </div>
                <Button type="submit" disabled={sending} className="gap-2">
                  <Send className="w-4 h-4" />
                  {sending ? "Sending..." : "Send message"}
                </Button>
              </form>
            )}
          </Card>

          <div className="flex items-center gap-3 text-muted-foreground text-sm">
            <MessageSquare className="w-4 h-4 shrink-0" />
            <p>
              Prefer to chat? <Link href="/" className="text-primary hover:underline">Start a conversation</Link> with our AI assistant.
            </p>
          </div>

          <div className="mt-8">
            <Link href="/">
              <Button variant="outline">Back to home</Button>
            </Link>
          </div>
        </main>
      </div>
    </ThemeProvider>
  )
}

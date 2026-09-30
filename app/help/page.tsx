"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import AuthenticatedLayout from "@/components/authenticated-layout"
import { Mail, Send, MessageSquare, Phone } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export default function HelpPage() {
  const { user } = useAuth()
  const [name, setName] = useState(user?.username || "")
  const [email, setEmail] = useState(user?.email || "")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setSent(true)
    setSending(false)
    setSubject("")
    setMessage("")
  }

  return (
    <AuthenticatedLayout>
      <div className="h-full overflow-y-auto bg-muted/10">
        <div className="container mx-auto py-10 px-4 max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Help & Support</h1>
              <p className="text-muted-foreground mt-1">
                We're here to help. Contact us if you have any questions or issues.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Contact Info Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Email Us</p>
                      <a href="mailto:support@dailychatai.com" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                        support@dailychatai.com
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Live Chat</p>
                      <p className="text-sm text-muted-foreground">
                        Available Mon-Fri, 9am-5pm UTC
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-primary text-primary-foreground border-none">
                <CardHeader>
                  <CardTitle className="text-lg">Pro Tip</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm opacity-90">
                    Check our documentation for quick answers to common questions about setting up your projects and using models.
                  </p>
                  <Button variant="secondary" className="w-full mt-4" asChild>
                    <a href="/community">View Documentation</a>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Send us a message</CardTitle>
                  <CardDescription>
                    Fill out the form below and we'll get back to you as soon as possible.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sent ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                        <Send className="w-8 h-8 text-green-600 dark:text-green-500" />
                      </div>
                      <h3 className="text-xl font-semibold">Message Sent!</h3>
                      <p className="text-muted-foreground max-w-md">
                        Thank you for reaching out. Our support team has received your message and will respond to <strong>{email}</strong> shortly.
                      </p>
                      <Button onClick={() => setSent(false)} variant="outline" className="mt-4">
                        Send another message
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label htmlFor="name" className="text-sm font-medium">Name</label>
                          <Input
                            id="name"
                            placeholder="Your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="email" className="text-sm font-medium">Email</label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="subject" className="text-sm font-medium">Subject</label>
                        <Input
                          id="subject"
                          placeholder="How can we help?"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="message" className="text-sm font-medium">Message</label>
                        <Textarea
                          id="message"
                          placeholder="Describe your issue or question..."
                          rows={6}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          required
                        />
                      </div>

                      <Button type="submit" className="w-full gap-2" disabled={sending}>
                        {sending ? (
                          <>Sending...</>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Send Message
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}

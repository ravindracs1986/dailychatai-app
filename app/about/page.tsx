"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Navigation from "@/components/navigation"
import { MessageSquare, Sparkles, Shield, Zap } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <div className="h-full overflow-y-auto">
        <main className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-2">About Dailychatai AI Chat</h1>
          <p className="text-muted-foreground text-lg mb-8">
            A modern AI chat application powered by Dailychatai, with support for multiple models,
            conversations, and optional authentication.
          </p>

          <div className="grid gap-6 md:grid-cols-2 mb-12">
            <Card className="p-6 border-border/50">
              <MessageSquare className="w-10 h-10 text-primary mb-3" />
              <h2 className="text-xl font-semibold mb-2">Smart conversations</h2>
              <p className="text-muted-foreground text-sm">
                Chat with hundreds of free AI models. Save conversations when you sign in and pick up
                where you left off.
              </p>
            </Card>
            <Card className="p-6 border-border/50">
              <Sparkles className="w-10 h-10 text-primary mb-3" />
              <h2 className="text-xl font-semibold mb-2">Multiple models</h2>
              <p className="text-muted-foreground text-sm">
                Choose from Ultra, Pro, Fast, and more tiers. Browse models by name, context length,
                and capabilities on the Models page.
              </p>
            </Card>
            <Card className="p-6 border-border/50">
              <Shield className="w-10 h-10 text-primary mb-3" />
              <h2 className="text-xl font-semibold mb-2">Secure & private</h2>
              <p className="text-muted-foreground text-sm">
                Optional sign-in with JWT, bcrypt, and plan-based usage. Your data is handled with
                care; API keys stay server-side.
              </p>
            </Card>
            <Card className="p-6 border-border/50">
              <Zap className="w-10 h-10 text-primary mb-3" />
              <h2 className="text-xl font-semibold mb-2">Fast & responsive</h2>
              <p className="text-muted-foreground text-sm">
                Built with Next.js and a clean UI. Dark/light theme, mobile-friendly layout, and
                smooth interactions.
              </p>
            </Card>
          </div>

          <div className="flex flex-wrap gap-6">
            <Link href="/">
              <Button>Start chatting</Button>
            </Link>
            
          </div>
        </main>
      </div>
    </div>
  )
}

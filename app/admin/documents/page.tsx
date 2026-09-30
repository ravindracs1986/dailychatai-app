"use client"

import { Card } from "@/components/ui/card"
import AuthenticatedLayout from "@/components/authenticated-layout"
import { Book, Code, Zap, MessageSquare, Key, Sparkles, ExternalLink, ChevronRight } from "lucide-react"

export default function AdminDocumentsPage() {
  return (
    <AuthenticatedLayout>
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto py-10 px-4 max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600">
                <Book className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Manage Documents</h1>
                <p className="text-muted-foreground mt-1">
                  Review and manage application documentation
                </p>
              </div>
            </div>
          </div>

          {/* Quick Start */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Zap className="w-6 h-6 text-cyan-500" />
              Quick Start
            </h2>
            <Card className="p-6 border-border/50">
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-sm font-bold">1</span>
                  <div>
                    <p className="font-semibold mb-1">Get an API Key</p>
                    <p className="text-sm text-muted-foreground">
                      Visit <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline">openrouter.ai</a> to create a free account and get your API key.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-sm font-bold">2</span>
                  <div>
                    <p className="font-semibold mb-1">Configure Your Key</p>
                    <p className="text-sm text-muted-foreground">
                      Enter your API key when prompted on the home page, or configure it in the application settings.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-sm font-bold">3</span>
                  <div>
                    <p className="font-semibold mb-1">Start Chatting</p>
                    <p className="text-sm text-muted-foreground">
                      Select a model, type your message, and press Enter to start chatting with AI!
                    </p>
                  </div>
                </li>
              </ol>
            </Card>
          </section>

          {/* Features */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-cyan-500" />
              Features
            </h2>
            <div className="grid gap-4">
              <Card className="p-6 border-border/50">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-cyan-500 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Multiple AI Models</h3>
                    <p className="text-sm text-muted-foreground">
                      Access hundreds of free AI models categorized by performance: Ultra, Pro, Fast, Normal, and Slow tiers. Each model has different capabilities and context lengths.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-border/50">
                <div className="flex items-start gap-3">
                  <Code className="w-5 h-5 text-cyan-500 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Advanced Model Selector</h3>
                    <p className="text-sm text-muted-foreground">
                      Search and filter models by category, name, or capabilities. See detailed information including context length, vision support, and provider details.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-border/50">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-cyan-500 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Smart Input</h3>
                    <p className="text-sm text-muted-foreground">
                      Auto-resizing text input with character counter. Press Enter to send or Shift+Enter for new lines. Suggested prompts help you get started.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-border/50">
                <div className="flex items-start gap-3">
                  <Key className="w-5 h-5 text-cyan-500 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Free Models Directory</h3>
                    <p className="text-sm text-muted-foreground">
                      Browse all available free models with detailed specifications, descriptions, and direct links to model pages.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* API Configuration */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Key className="w-6 h-6 text-cyan-500" />
              API Configuration
            </h2>
            <Card className="p-6 border-border/50">
              <h3 className="font-semibold mb-3">Setting up your API Key</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  The application uses OpenRouter API to access multiple AI models. You can configure API keys in two ways:
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="font-semibold text-foreground mb-2">Method 1: User API Key (Recommended)</p>
                  <p>Enter your personal API key when prompted. This key is stored in your browser's local storage.</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="font-semibold text-foreground mb-2">Method 2: Pre-configured Keys</p>
                  <p>Developers can add API keys directly in the <code className="px-2 py-1 bg-background rounded">config/index.ts</code> file under the <code className="px-2 py-1 bg-background rounded">apiKeys</code> array.</p>
                </div>
              </div>
            </Card>
          </section>

          {/* Model Categories */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-cyan-500" />
              Model Categories
            </h2>
            <Card className="p-6 border-border/50">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold">ULTRA</div>
                  <p className="text-sm text-muted-foreground flex-1">
                    Cutting-edge flagship models with the highest capabilities (GPT-5, Claude Opus 4, O3, Gemini 3)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold">PRO</div>
                  <p className="text-sm text-muted-foreground flex-1">
                    High-performance production models (GPT-4o, Claude 3.7, DeepSeek R1, Gemini 2.5)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="px-3 py-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold">FAST</div>
                  <p className="text-sm text-muted-foreground flex-1">
                    Quick, efficient models optimized for speed (Flash, Mini, Nano variants)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="px-3 py-1 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 text-white text-xs font-bold">NORMAL</div>
                  <p className="text-sm text-muted-foreground flex-1">
                    Balanced models for general use cases
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="px-3 py-1 rounded-full bg-gradient-to-r from-slate-400 to-slate-500 text-white text-xs font-bold">SLOW</div>
                  <p className="text-sm text-muted-foreground flex-1">
                    Older or less optimized models, still functional but slower
                  </p>
                </div>
              </div>
            </Card>
          </section>

          {/* Tips */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Tips & Tricks</h2>
            <Card className="p-6 border-border/50">
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" />
                  <span>Use Shift+Enter to add line breaks in your messages without sending</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" />
                  <span>Try different models to find the best fit for your use case - some excel at coding, others at creative writing</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" />
                  <span>Check the context length when working with long documents - higher context allows more content</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" />
                  <span>Models with vision support can analyze images (look for the eye icon)</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" />
                  <span>Use the search feature in the model selector to quickly find specific models</span>
                </li>
              </ul>
            </Card>
          </section>

          {/* Resources */}
          <section>
            <h2 className="text-2xl font-bold mb-4">External Resources</h2>
            <Card className="p-6 border-border/50">
              <div className="space-y-3">
                <a
                  href="https://openrouter.ai/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Book className="w-5 h-5 text-cyan-500" />
                    <div>
                      <p className="font-semibold">OpenRouter Documentation</p>
                      <p className="text-xs text-muted-foreground">Official API documentation and guides</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-cyan-500" />
                </a>
                <a
                  href="https://openrouter.ai/models"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-cyan-500" />
                    <div>
                      <p className="font-semibold">Model Directory</p>
                      <p className="text-xs text-muted-foreground">Browse all available models on OpenRouter</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-cyan-500" />
                </a>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-cyan-500" />
                    <div>
                      <p className="font-semibold">API Keys</p>
                      <p className="text-xs text-muted-foreground">Manage your OpenRouter API keys</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-cyan-500" />
                </a>
              </div>
            </Card>
          </section>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}

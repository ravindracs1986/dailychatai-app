"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Send, Loader2, ChevronDown, Paperclip, Mic, FolderOpen, StopCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import ChatMessage from "./chat-message"
import { PromptLibraryModal } from "./prompt-library-modal"

interface Message {
  role: string
  content: string
  isImage?: boolean
  isError?: boolean
}

// Add type definition for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

const MAX_CHARS = 3000

export default function ChatArea({ 
  messages, 
  onSendMessage, 
  loading, 
  inputDisabled,
  inputDisabledMessage,
  imageMode,
  selectedModelName,
  onModelClick,
  customEmptyState,
  showChatBoxLayout,
}: {
  messages: Message[]
  onSendMessage: (message: string) => void
  loading: boolean
  inputDisabled?: boolean
  inputDisabledMessage?: string
  imageMode: boolean
  selectedModelName?: string
  onModelClick?: () => void
  customEmptyState?: React.ReactNode
  showChatBoxLayout?: boolean
}) {
  const [input, setInput] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [showPromptLibrary, setShowPromptLibrary] = useState(false)
  const { toast } = useToast()
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  
  const charCount = input.length

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px"
    }
  }, [input])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputDisabled) {
      if (inputDisabledMessage) {
        toast({
          title: "Message limit reached",
          description: inputDisabledMessage,
          variant: "destructive",
        })
      }
      return
    }
    if (input.trim() && !loading) {
      onSendMessage(input)
      setInput("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast({
        title: "Not Supported",
        description: "Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.",
        variant: "destructive",
      })
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = (event: any) => {
      //console.error("Speech recognition error", event.error)
      setIsListening(false)
      
      let errorMessage = "An error occurred with voice input."
      
      switch (event.error) {
        case 'not-allowed':
          errorMessage = "Microphone access denied. Please check your browser settings."
          break
        case 'no-speech':
          errorMessage = "No speech detected. Please try again."
          break
        case 'network':
          errorMessage = "Network error. Please check your connection."
          break
        default:
          errorMessage = `Voice input error: ${event.error}`
      }

      toast({
        title: "Voice Input Error",
        description: errorMessage,
        variant: "destructive",
      })
    }

    let finalTranscript = ""

    recognition.onresult = (event: any) => {
      let interimTranscript = ""
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        } else {
          interimTranscript += event.results[i][0].transcript
        }
      }
      
      if (finalTranscript) {
        setInput(prev => {
          const trailingSpace = prev.length > 0 && !prev.endsWith(" ") ? " " : ""
          return prev + trailingSpace + finalTranscript
        })
        finalTranscript = "" // Reset for next segment
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Allow text-based files
    if (file.type.startsWith('text/') || 
        file.name.match(/\.(js|ts|tsx|jsx|py|json|md|sql|env|css|html|xml|yaml|yml|sh|bat|ps1)$/)) {
      try {
        const text = await file.text()
        setInput(prev => {
          const prefix = prev ? prev + "\n\n" : ""
          return prefix + `\`\`\`${file.name}\n${text}\n\`\`\``
        })
      } catch (err) {
        console.error("Error reading file:", err)
        toast({
          title: "File Error",
          description: "Failed to read file content.",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "Invalid File Type",
        description: "Currently only text-based files (code, logs, docs) are supported for attachment.",
        variant: "destructive",
      })
    }
    
    // Reset input so same file can be selected again
    e.target.value = ""
  }

  const handlePromptSelect = (promptContent: string) => {
    setInput(prev => {
      const prefix = prev ? prev + "\n\n" : ""
      return prefix + promptContent
    })
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden !bg-slate-50 dark:!bg-background">
      <PromptLibraryModal 
        open={showPromptLibrary} 
        onOpenChange={setShowPromptLibrary}
        onSelectPrompt={handlePromptSelect}
      />
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-3xl mx-auto px-4 py-8 ">
          {messages.length === 0 && (
            <div className="flex items-center justify-center min-h-full py-10">
              {customEmptyState ?? (
                <div className="text-center max-w-2xl px-4 ">
                  <h1 className="text-3xl sm:text-4xl font-semibold mb-3">{imageMode ? "Generate Images" : "How can I help you today?"}</h1>
                  <p className="text-muted-foreground text-lg mb-8 ">
                    {imageMode 
                      ? "Describe the image you want to create" 
                      : "Ask me anything, I'm here to help"}
                  </p>
                  {!imageMode && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-8">
                      <button 
                        type="button"
                        onClick={() => setInput("Explain quantum computing")}
                        className="p-4 border rounded-xl hover:bg-muted/50 transition text-left bg-white"
                      >
                        <div className="text-sm font-medium mb-1">Explain a concept</div>
                        <div className="text-xs text-muted-foreground">Learn about complex topics</div>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setInput("Write code for")}
                        className="p-4 border rounded-xl hover:bg-muted/50 transition text-left bg-white"
                      >
                        <div className="text-sm font-medium mb-1">Get code help</div>
                        <div className="text-xs text-muted-foreground">Programming assistance</div>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setInput("Help me with")}
                        className="p-4 border rounded-xl hover:bg-muted/50 transition text-left bg-white"
                      >
                        <div className="text-sm font-medium mb-1">Plan & organize</div>
                        <div className="text-xs text-muted-foreground">Get things done</div>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="space-y-6">
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <div className="flex-1 pt-1">
                  <div className="text-sm text-muted-foreground">Thinking...</div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t !bg-slate-50 dark:!bg-background shrink-0">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-4">
          {showChatBoxLayout ? (
            <div className="rounded-2xl border-2 border-primary/20 bg-white dark:bg-background shadow-sm overflow-hidden focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-colors">
              <div className="p-3 pb-0">
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      inputDisabled
                        ? (inputDisabledMessage || "Daily message limit reached.")
                        : imageMode
                          ? "Describe the image..."
                          : "Type your message..."
                    }
                    className="w-full px-4 py-3 pr-12 min-h-[80px] max-h-[200px] resize-none bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground"
                    rows={2}
                    disabled={loading || !!inputDisabled}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!input.trim() || loading || !!inputDisabled}
                    className="absolute bottom-3 right-2 h-9 w-9 rounded-lg shrink-0"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-t bg-muted/30">
                <div className="flex items-center gap-1">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileSelect}
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="w-4 h-4" />
                    <span className="text-xs">Attach</span>
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className={`h-8 gap-1.5 ${isListening ? "text-red-500 hover:text-red-600 bg-red-50" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={handleVoiceInput}
                  >
                    {isListening ? <StopCircle className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
                    <span className="text-xs">{isListening ? "Stop" : "Voice Message"}</span>
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPromptLibrary(true)}
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span className="text-xs">Browse Prompts</span>
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onModelClick}
                    className="h-8 gap-1.5 px-2.5 rounded-lg border bg-white dark:bg-background shrink-0 max-w-[180px]"
                  >
                    <span className="truncate text-xs font-medium">{selectedModelName || "Select Model"}</span>
                    <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  </Button>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {charCount}/{MAX_CHARS}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {onModelClick && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onModelClick}
                  className="h-[52px] shrink-0 rounded-xl border px-3 font-medium min-w-0 max-w-[180px] bg-white dark:bg-background"
                >
                  <span className="truncate">{selectedModelName || "Select Model"}</span>
                  <ChevronDown className="w-4 h-4 shrink-0 ml-1 opacity-70" />
                </Button>
              )}
              <div className="relative flex-1 min-w-0">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    inputDisabled
                      ? (inputDisabledMessage || "Daily message limit reached.")
                      : imageMode
                        ? "Describe the image..."
                        : "Type your message..."
                  }
                  className="w-full px-4 py-3 pr-12 border rounded-2xl focus:outline-none focus:ring-1 focus:ring-ring resize-none min-h-[52px] max-h-[200px] bg-white dark:bg-background"
                  rows={1}
                  disabled={loading || !!inputDisabled}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || loading || !!inputDisabled}
                  className="absolute bottom-2.5 right-2.5 h-7 w-7 rounded-lg"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

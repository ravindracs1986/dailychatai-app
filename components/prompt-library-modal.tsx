
"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Upload, FileText, Code, PenTool, Lightbulb } from "lucide-react"

interface PromptLibraryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectPrompt: (prompt: string) => void
}

const SYSTEM_PROMPTS = [
  {
    category: "Coding",
    icon: Code,
    prompts: [
      {
        title: "Code Reviewer",
        content: "Please review the following code for bugs, security vulnerabilities, and performance improvements. Explain your reasoning."
      },
      {
        title: "React Component Generator",
        content: "Create a modern, responsive React component using Tailwind CSS and Lucide icons. The component should be..."
      },
      {
        title: "Unit Test Writer",
        content: "Write comprehensive unit tests for the following function using Jest and React Testing Library:"
      }
    ]
  },
  {
    category: "Writing",
    icon: PenTool,
    prompts: [
      {
        title: "Blog Post Outline",
        content: "Create a detailed outline for a blog post about [TOPIC]. Include an introduction, 3-4 main sections with sub-points, and a conclusion."
      },
      {
        title: "Email Polisher",
        content: "Rewrite the following email to be more professional, concise, and persuasive:"
      },
      {
        title: "Creative Story",
        content: "Write a short story about [CHARACTER] who discovers [OBJECT] in a [SETTING]. The tone should be [TONE]."
      }
    ]
  },
  {
    category: "Brainstorming",
    icon: Lightbulb,
    prompts: [
      {
        title: "Business Ideas",
        content: "Generate 5 innovative business ideas based on the following trends: [TRENDS]."
      },
      {
        title: "Project Name Generator",
        content: "Suggest 10 catchy and unique names for a project that does [DESCRIPTION]."
      }
    ]
  }
]

export function PromptLibraryModal({ open, onOpenChange, onSelectPrompt }: PromptLibraryModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text) {
        onSelectPrompt(text)
        onOpenChange(false)
      }
    }
    reader.readAsText(file)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Prompt Library</DialogTitle>
          <DialogDescription>
            Choose a preset prompt or upload your own file.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="presets" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="presets">Presets</TabsTrigger>
            <TabsTrigger value="upload">Upload File</TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {SYSTEM_PROMPTS.map((category) => (
                  <div key={category.category}>
                    <h3 className="flex items-center gap-2 font-medium mb-3 text-primary">
                      <category.icon className="w-4 h-4" />
                      {category.category}
                    </h3>
                    <div className="grid gap-2">
                      {category.prompts.map((prompt, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          className="h-auto py-3 px-4 justify-start text-left whitespace-normal"
                          onClick={() => {
                            onSelectPrompt(prompt.content)
                            onOpenChange(false)
                          }}
                        >
                          <div>
                            <div className="font-medium text-sm">{prompt.title}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {prompt.content}
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4 hover:bg-muted/50 transition cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Upload Prompt File</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Supports .txt, .md, .json files
                </p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".txt,.md,.json,.js,.ts,.py"
                onChange={handleFileUpload}
              />
              <Button variant="secondary">Select File</Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

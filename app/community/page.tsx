"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import AuthenticatedLayout from "@/components/authenticated-layout"
import { Users, MessageCircle, Share2 } from "lucide-react"

export default function CommunityPage() {
  return (
    <AuthenticatedLayout>
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto py-10 px-4 max-w-4xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Community</h1>
              <p className="text-muted-foreground mt-1">
                Connect with other users and share your projects.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Discussions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Join the conversation about AI models, prompting tips, and more.
                </p>
                <div className="text-sm bg-muted p-4 rounded-lg">
                  Coming soon: Community forums where you can ask questions and share insights.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Share2 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Shared Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Explore projects created by other community members.
                </p>
                <div className="text-sm bg-muted p-4 rounded-lg">
                  Coming soon: Public project gallery and templates.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}

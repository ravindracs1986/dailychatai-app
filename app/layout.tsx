import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { CONFIG } from "@/config"
import { AuthProvider } from "@/contexts/auth-context"
import Footer from "@/components/footer"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: CONFIG.site.title,
  description: CONFIG.site.description,
  applicationName: CONFIG.site.name,
  creator: CONFIG.site.author,
  generator: "anbuinfosec.dev",
  openGraph: {
    title: CONFIG.site.title,
    description: CONFIG.site.description,
    url: CONFIG.site.url,
    siteName: CONFIG.site.name,
    images: CONFIG.site.ogImage ? [{ url: CONFIG.site.ogImage }] : [],
  },
   icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: CONFIG.site.favicon || "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0891b2",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  )
}

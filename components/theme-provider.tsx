"use client"

import type React from "react"

export default function ThemeProvider({ children, theme }: { children: React.ReactNode; theme: string }) {
  return <>{children}</>
}

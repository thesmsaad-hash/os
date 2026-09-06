"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// Silence the React 19 / Next.js 16 development false-positive warning for next-themes inline theme script
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const origError = console.error
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("Encountered a script tag")) {
      return
    }
    origError.apply(console, args)
  }
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}


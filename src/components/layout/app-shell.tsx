"use client"

import { useEffect } from "react"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { useAuthStore } from "@/lib/stores/use-auth-store"
import { LoginView } from "@/components/auth/login-view"
import { ShieldCheck } from "lucide-react"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized, initAuth } = useAuthStore()

  useEffect(() => {
    initAuth()
  }, [initAuth])

  // Ambient loader while restoring session
  if (!isInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0a0d14]">
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 animate-pulse">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <p className="text-xs text-muted-foreground font-mono tracking-wider">
            INITIALIZING WORKSPACE...
          </p>
        </div>
      </div>
    )
  }

  // Not authenticated -> show Command Center login screen
  if (!isAuthenticated) {
    return <LoginView />
  }

  // Authenticated -> render command center layout
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-auto bg-muted/20">
          <div className="h-full w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}


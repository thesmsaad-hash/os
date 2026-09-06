"use client"

import { Sidebar } from "./sidebar"
import { Header } from "./header"

export function AppShell({ children }: { children: React.ReactNode }) {
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

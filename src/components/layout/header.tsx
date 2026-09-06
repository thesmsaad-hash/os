"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Bell, Sun, Moon, Command, Radio, ExternalLink, Send, Settings, Check, Cloud, RefreshCw, Database } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CommandPalette } from "@/components/command-palette"
import {
  getNtfyConfig,
  getNtfyLogs,
  sendNtfyNotification,
  type NtfyConfig,
  type NotificationLogItem
} from "@/lib/ntfy"
import { useSyncStore } from "@/lib/stores/use-sync-store"
import { useUserStore } from "@/lib/stores/use-user-store"

export function Header() {
  const { theme, setTheme } = useTheme()
  const sync = useSyncStore()
  const { user } = useUserStore()
  const [mounted, setMounted] = useState(false)
  const [openNotifs, setOpenNotifs] = useState(false)
  const [config, setConfig] = useState<NtfyConfig | null>(null)
  const [logs, setLogs] = useState<NotificationLogItem[]>([])
  const [sendingTest, setSendingTest] = useState(false)
  const [testSuccess, setTestSuccess] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    sync.checkStatus().catch(() => {})
    const load = () => {
      setConfig(getNtfyConfig())
      setLogs(getNtfyLogs())
    }
    load()

    const onConfigUpdate = () => load()
    const onLogUpdate = () => setLogs(getNtfyLogs())

    window.addEventListener("ntfy-config-updated", onConfigUpdate)
    window.addEventListener("ntfy-log-updated", onLogUpdate)

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenNotifs(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)

    return () => {
      window.removeEventListener("ntfy-config-updated", onConfigUpdate)
      window.removeEventListener("ntfy-log-updated", onLogUpdate)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleSendTest = async () => {
    setSendingTest(true)
    const res = await sendNtfyNotification({
      title: "🔔 Personal OS Alert",
      message: "Test notification dispatched from Header",
      priority: 4,
      tags: ["tada", "bell"],
    })
    setSendingTest(false)
    if (res.success) {
      setTestSuccess(true)
      setTimeout(() => setTestSuccess(false), 2500)
    }
  }

  const topic = config?.topic || "personal-os-saad"
  const server = config?.server || "https://ntfy.sh"
  const isEnabled = config?.enabled ?? true

  return (
    <>
      <CommandPalette />
      <header className="h-14 border-b flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center w-full max-w-md">
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))}
            className="flex items-center gap-2.5 w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Search everything...</span>
            <kbd className="hidden sm:flex items-center gap-1 text-[10px] bg-background/80 border rounded px-1.5 py-0.5">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-3 ml-4">
          {/* ── Turso Edge Auto-Save Status Pill ── */}
          <div className="hidden sm:flex items-center">
            {sync.status === "syncing" && (
              <div className="flex items-center gap-1.5 text-xs text-primary px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Saving to Turso...</span>
              </div>
            )}
            {sync.status === "synced" && (
              <div
                className="flex items-center gap-1.5 text-xs text-muted-foreground/80 px-2.5 py-1 rounded-full bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors cursor-default"
                title={`Turso Edge Database: Synced ${sync.latencyMs ? `(${sync.latencyMs}ms)` : ''} · ${sync.lastSyncedAt || ''}`}
              >
                <Database className="h-3 w-3 text-emerald-400" />
                <span className="font-medium text-emerald-400">Turso</span>
                <span className="text-muted-foreground/60">·</span>
                <span>{sync.lastSavedFormatted}</span>
              </div>
            )}
            {sync.status === "offline" && (
              <div className="flex items-center gap-1.5 text-xs text-amber-400 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 cursor-default" title="Changes saved locally. Will sync to Turso when online.">
                <Cloud className="h-3 w-3" />
                <span>{sync.lastSavedFormatted}</span>
              </div>
            )}
            {sync.status === "error" && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/25" title={sync.error || "Sync error"}>
                <Cloud className="h-3 w-3" />
                <span>{sync.lastSavedFormatted}</span>
              </div>
            )}
          </div>

          {/* ── Notification Bell + Popover ── */}
          <div className="relative" ref={popoverRef}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpenNotifs(o => !o)}
              className="text-muted-foreground hover:text-foreground relative"
              title="Push Notifications (ntfy)"
            >
              <Bell className="h-5 w-5" />
              {isEnabled && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-emerald-500 rounded-full ring-2 ring-background" />
              )}
            </Button>

            {openNotifs && (
              <div className="absolute right-0 mt-2 w-84 sm:w-96 rounded-xl border bg-card/95 backdrop-blur-md shadow-xl p-4 z-50 text-foreground text-sm">
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">ntfy Notifications</span>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                    isEnabled
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-muted text-muted-foreground border-border"
                  }`}>
                    {isEnabled ? "Online" : "Disabled"}
                  </span>
                </div>

                {/* Status & Topic banner */}
                <div className="mt-3 p-2.5 bg-muted/40 rounded-lg border border-border/50 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Active Topic:</span>
                    <a
                      href={`${server}/${encodeURIComponent(topic)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-primary hover:underline flex items-center gap-1"
                    >
                      <span>{topic}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {/* Actions row */}
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs gap-1.5 h-8"
                    onClick={handleSendTest}
                    disabled={sendingTest}
                  >
                    {testSuccess ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Sent!</span>
                      </>
                    ) : (
                      <>
                        <Send className={`h-3.5 w-3.5 ${sendingTest ? "animate-spin" : ""}`} />
                        <span>Send Test Alert</span>
                      </>
                    )}
                  </Button>
                  <Link
                    href="/settings"
                    onClick={() => setOpenNotifs(false)}
                    className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-input text-xs font-medium bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>Settings</span>
                  </Link>
                </div>

                {/* Recent Notifications List */}
                <div className="mt-4 pt-3 border-t border-border/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Recent Activity
                    </span>
                    <span className="text-[10px] text-muted-foreground">{logs.length} logged</span>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {logs.length === 0 ? (
                      <div className="py-4 text-center text-xs text-muted-foreground">
                        No notifications sent yet.
                      </div>
                    ) : (
                      logs.slice(0, 5).map(item => (
                        <div key={item.id} className="p-2 rounded-lg bg-background/50 border border-border/40 text-xs">
                          <div className="flex items-center justify-between font-medium">
                            <span>{item.title}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{item.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          )}

          <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-sm font-bold ml-1 uppercase cursor-default" title={user.name}>
            {user.name ? user.name.trim()[0] : "S"}
          </div>
        </div>
      </header>
    </>
  )
}


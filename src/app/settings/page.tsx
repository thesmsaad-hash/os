"use client"

import { useState, useEffect } from "react"
import {
  User, Palette, Bell, Keyboard, Shield, Download,
  Moon, Sun, Monitor, ChevronRight, Check, Laptop,
  Clock, Globe, Zap, ToggleLeft, ToggleRight,
  Radio, ExternalLink, Copy, RefreshCw, Send, Smartphone,
  Key, Eye, EyeOff, Cloud, HardDrive, FolderSync, FileText, CheckCircle,
  Database, Server, Cpu, Layers, Activity, Mic, Calendar as CalendarIcon,
  Volume2, Sparkles, Bot
} from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  getNtfyConfig,
  saveNtfyConfig,
  sendNtfyNotification,
  generateRandomTopic,
  DEFAULT_NTFY_CONFIG,
  type NtfyConfig
} from "@/lib/ntfy"
import {
  checkDriveHealth,
  initializeDriveStorage,
  createDriveBackup,
} from "@/lib/drive-api"
import { useUserStore } from "@/lib/stores/use-user-store"
import { useSyncStore } from "@/lib/stores/use-sync-store"
import { flushPending } from "@/lib/sync-manager"

// ── types ─────────────────────────────────────────────────────────────────────
type Section = "profile" | "appearance" | "notifications" | "integrations" | "storage" | "shortcuts" | "privacy"

const SECTIONS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "profile",       label: "Profile",        icon: User        },
  { id: "appearance",    label: "Appearance",      icon: Palette     },
  { id: "notifications", label: "Notifications",   icon: Bell        },
  { id: "integrations",  label: "Integrations",    icon: Mic         },
  { id: "storage",       label: "Turso & Storage", icon: Database    },
  { id: "shortcuts",     label: "Shortcuts",       icon: Keyboard    },
  { id: "privacy",       label: "Privacy",         icon: Shield      },
]

const SHORTCUTS = [
  { action: "Open Command Palette", keys: ["Ctrl", "K"]    },
  { action: "New Task",             keys: ["Ctrl", "N"]    },
  { action: "Search",               keys: ["/"]            },
  { action: "Toggle Sidebar",       keys: ["Ctrl", "\\"]   },
  { action: "Dashboard",            keys: ["Ctrl", "1"]    },
  { action: "Tasks",                keys: ["Ctrl", "2"]    },
  { action: "Calendar",             keys: ["Ctrl", "3"]    },
  { action: "Focus Timer",          keys: ["Ctrl", "4"]    },
  { action: "Undo",                 keys: ["Ctrl", "Z"]    },
  { action: "Redo",                 keys: ["Ctrl", "Y"]    },
]

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  )
}

function SettingsRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border/50 last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="ml-8 shrink-0">{children}</div>
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>("profile")
  const { theme, setTheme } = useTheme()

  // User Profile & Cloud Sync Store
  const { user, updateUser, updatePreferences } = useUserStore()
  const sync = useSyncStore()

  // ntfy config state
  const [ntfyConfig, setNtfyConfig] = useState<NtfyConfig>(DEFAULT_NTFY_CONFIG)
  const [ntfyTopicInput, setNtfyTopicInput] = useState(DEFAULT_NTFY_CONFIG.topic)
  const [copied, setCopied] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [testStatus, setTestStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  // Turso LibSQL Edge Database state
  const [tursoHealth, setTursoHealth] = useState<{
    connected?: boolean
    latencyMs?: number
    status?: string
    provider?: string
    info?: {
      serverTime?: string
      sqliteVersion?: string
      collections?: Record<string, number>
    }
    error?: string
  } | null>(null)
  const [tursoTesting, setTursoTesting] = useState(false)

  // Google Drive / GAS config state
  const [gasUrl, setGasUrl] = useState("")
  const [gasKey, setGasKey] = useState("personal_os_secret_key_2026")
  const [showGasKey, setShowGasKey] = useState(false)
  const [gasHealth, setGasHealth] = useState<{ connected: boolean; configured: boolean; latencyMs?: number; error?: string } | null>(null)
  const [gasTesting, setGasTesting] = useState(false)
  const [gasInitializing, setGasInitializing] = useState(false)
  const [gasInitResult, setGasInitResult] = useState<string | null>(null)
  const [gasBackupLoading, setGasBackupLoading] = useState(false)
  const [gasBackupResult, setGasBackupResult] = useState<string | null>(null)
  const [gasSaved, setGasSaved] = useState(false)

  // Google Assistant & Voice Webhook state
  const [voiceInput, setVoiceInput] = useState("Hey Google, add a task review quarterly roadmap tomorrow high priority")
  const [voiceRunning, setVoiceRunning] = useState(false)
  const [voiceResult, setVoiceResult] = useState<any>(null)
  const [copiedWebhook, setCopiedWebhook] = useState(false)
  const [copiedFeed, setCopiedFeed] = useState(false)
  const [calSyncing, setCalSyncing] = useState(false)
  const [calSyncResult, setCalSyncResult] = useState<{ success: boolean; msg: string } | null>(null)

  const handleRunVoice = async (queryToRun?: string) => {
    const q = queryToRun || voiceInput
    if (!q.trim()) return
    setVoiceRunning(true)
    setVoiceResult(null)

    try {
      const res = await fetch("/api/assistant/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      })
      const data = await res.json()
      setVoiceRunning(false)
      setVoiceResult(data)

      // Optionally speak back response
      if (typeof window !== "undefined" && "speechSynthesis" in window && data.speech) {
        try {
          window.speechSynthesis.cancel()
          const utterance = new SpeechSynthesisUtterance(data.speech)
          utterance.rate = 1.05
          window.speechSynthesis.speak(utterance)
        } catch {}
      }
    } catch (err: unknown) {
      setVoiceRunning(false)
      setVoiceResult({
        success: false,
        error: err instanceof Error ? err.message : "Voice webhook request failed",
        speech: "Network error calling Google Assistant webhook",
      })
    }
  }

  const handleSyncCalendar = async () => {
    setCalSyncing(true)
    setCalSyncResult(null)
    try {
      const res = await fetch("/api/calendar/google-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gas-api-url": gasUrl || "",
          "x-gas-api-key": gasKey || "",
        },
        body: JSON.stringify({ gasUrl, gasKey }),
      })
      const data = await res.json()
      setCalSyncing(false)
      if (data.success) {
        setCalSyncResult({
          success: true,
          msg: `Synced! Imported ${data.importedCount ?? 0} events from Google Calendar.`,
        })
      } else {
        setCalSyncResult({
          success: false,
          msg: data.error || "Calendar sync failed. Verify your Google Apps Script URL.",
        })
      }
    } catch (err: unknown) {
      setCalSyncing(false)
      setCalSyncResult({
        success: false,
        msg: err instanceof Error ? err.message : "Sync network error",
      })
    }
  }

  const fetchTursoHealth = async () => {
    setTursoTesting(true)
    try {
      const res = await fetch("/api/turso/health")
      const data = await res.json()
      setTursoHealth(data)
    } catch (err: unknown) {
      setTursoHealth({
        connected: false,
        status: "error",
        error: err instanceof Error ? err.message : "Failed to ping Turso",
      })
    } finally {
      setTursoTesting(false)
    }
  }

  useEffect(() => {
    const cfg = getNtfyConfig()
    setNtfyConfig(cfg)
    setNtfyTopicInput(cfg.topic)

    // Initial silent Turso health check
    fetchTursoHealth()

    try {
      const savedGas = localStorage.getItem("personal_os_gas_config")
      if (savedGas) {
        const parsed = JSON.parse(savedGas)
        if (parsed.url) setGasUrl(parsed.url)
        if (parsed.key) setGasKey(parsed.key)
      }
    } catch {}

    // Initial silent health check
    checkDriveHealth().then(setGasHealth).catch(() => {})
  }, [])

  const saveGasConfig = (url: string, key: string) => {
    try {
      localStorage.setItem("personal_os_gas_config", JSON.stringify({ url, key }))
      setGasSaved(true)
      setTimeout(() => setGasSaved(false), 2000)
    } catch {}
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Sidebar ── */}
      <div className="w-52 shrink-0 border-r flex flex-col py-6 px-3 gap-1 bg-background/50">
        <p className="text-xs font-semibold text-muted-foreground px-3 mb-2 uppercase tracking-wide">Settings</p>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
              activeSection === s.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <s.icon className="h-4 w-4" />
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto p-8 max-w-2xl">

        {/* ── Profile ── */}
        {activeSection === "profile" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold mb-1">Profile</h2>
                <p className="text-sm text-muted-foreground">Manage your personal information (auto-saves to Turso Edge DB)</p>
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium border flex items-center gap-1.5 ${
                sync.status === "syncing"
                  ? "bg-primary/10 text-primary border-primary/20"
                  : sync.status === "offline"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              }`}>
                {sync.status === "syncing" ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Saving to Turso...</span>
                  </>
                ) : sync.status === "offline" ? (
                  <span>Offline cache</span>
                ) : (
                  <>
                    <Check className="h-3 w-3" />
                    <span>Auto-saved</span>
                  </>
                )}
              </span>
            </div>

            {/* avatar */}
            <div className="flex items-center gap-5 mb-8">
              <div className="h-20 w-20 rounded-2xl bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-primary text-3xl font-bold uppercase">
                {user.name ? user.name.trim()[0] : "S"}
              </div>
              <div>
                <Button variant="outline" size="sm">Change Avatar</Button>
                <p className="text-xs text-muted-foreground mt-1.5">JPG, PNG or GIF · Max 2MB</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Full Name</label>
                <Input
                  value={user.name}
                  onChange={e => updateUser({ name: e.target.value })}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Email</label>
                <Input
                  value={user.email}
                  onChange={e => updateUser({ email: e.target.value })}
                  type="email"
                  placeholder="your.email@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Timezone</label>
                <select
                  value={user.timezone}
                  onChange={e => updateUser({ timezone: e.target.value })}
                  className="w-full text-sm border rounded-md px-3 py-2 bg-background"
                >
                  {["Asia/Karachi","America/New_York","America/Los_Angeles","Europe/London","Europe/Paris","Asia/Dubai","Asia/Tokyo"].map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">City & Weather Location</label>
                <Input
                  value={user.city || "Lahore"}
                  onChange={e => {
                    const newCity = e.target.value
                    updateUser({
                      city: newCity,
                      weatherText: `${newCity} · ${user.temperature || "32°C"} · ${user.condition || "Partly Cloudy"}`,
                    })
                  }}
                  placeholder="e.g. Lahore, Karachi, Dubai, London..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Updates the interactive weather widget on your Dashboard.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Plan</label>
                <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
                  <Zap className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-primary">{user.plan || "Pro Plan"}</p>
                    <p className="text-xs text-muted-foreground">All features unlocked · Powered by Turso Edge Database</p>
                  </div>
                </div>
              </div>

              {/* Real-time Auto-save feedback */}
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs">
                  {sync.status === "syncing" ? (
                    <span className="flex items-center gap-1.5 text-primary">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving changes to Turso...</span>
                    </span>
                  ) : sync.status === "offline" ? (
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <span>⚠ Saved locally (will sync when online)</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>All updates auto-save automatically</span>
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => flushPending()}
                  disabled={sync.status === "syncing" || sync.pendingChanges === 0}
                  className="text-xs h-8 gap-1.5"
                >
                  <FolderSync className="h-3.5 w-3.5" />
                  <span>{sync.pendingChanges > 0 ? `Sync (${sync.pendingChanges})` : "Sync Now"}</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Appearance ── */}
        {activeSection === "appearance" && (
          <div>
            <h2 className="text-xl font-bold mb-1">Appearance</h2>
            <p className="text-sm text-muted-foreground mb-6">Customize how Personal OS looks</p>

            <div className="flex flex-col gap-6">
              <div>
                <p className="text-sm font-medium mb-3">Theme</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "light",  label: "Light",  icon: Sun     },
                    { value: "dark",   label: "Dark",   icon: Moon    },
                    { value: "system", label: "System", icon: Monitor },
                  ].map(t => (
                    <button
                      key={t.value}
                      onClick={() => setTheme(t.value)}
                      className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        theme === t.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <t.icon className={`h-8 w-8 ${theme === t.value ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-sm font-medium ${theme === t.value ? "text-primary" : "text-muted-foreground"}`}>{t.label}</span>
                      {theme === t.value && <span className="absolute top-2 right-2"><Check className="h-4 w-4 text-primary" /></span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-card border rounded-xl px-5">
                <SettingsRow label="Compact Mode" description="Reduce padding and spacing throughout the UI">
                  <Toggle
                    enabled={user.preferences?.compactMode ?? false}
                    onToggle={() => updatePreferences({ compactMode: !(user.preferences?.compactMode ?? false) })}
                  />
                </SettingsRow>
                <SettingsRow label="Animations" description="Enable smooth transitions and micro-animations">
                  <Toggle
                    enabled={user.preferences?.animations ?? true}
                    onToggle={() => updatePreferences({ animations: !(user.preferences?.animations ?? true) })}
                  />
                </SettingsRow>
                <SettingsRow label="Show greeting on Dashboard" description="Display a personalized greeting with time">
                  <Toggle
                    enabled={user.preferences?.showGreeting ?? true}
                    onToggle={() => updatePreferences({ showGreeting: !(user.preferences?.showGreeting ?? true) })}
                  />
                </SettingsRow>
              </div>
            </div>
          </div>
        )}

        {/* ── Notifications ── */}
        {activeSection === "notifications" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Notifications</h2>
              <p className="text-sm text-muted-foreground">
                Stay updated on your phone, desktop, or smartwatch via <strong className="text-foreground">ntfy.sh</strong> push notifications.
              </p>
            </div>

            {/* ntfy Integration Card */}
            <div className="bg-gradient-to-br from-card via-card to-primary/5 border border-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
                    <Radio className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">ntfy Push Service</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                        ntfyConfig.enabled
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "bg-muted text-muted-foreground border-border"
                      }`}>
                        {ntfyConfig.enabled ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">HTTP-based pub-sub push alerts without account or sign-up needed</p>
                  </div>
                </div>
                <Toggle
                  enabled={ntfyConfig.enabled}
                  onToggle={() => {
                    const next = !ntfyConfig.enabled
                    const updated = saveNtfyConfig({ enabled: next })
                    setNtfyConfig(updated)
                  }}
                />
              </div>

              {/* Topic Config */}
              <div className="grid gap-3 pt-1">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Your ntfy Topic
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        value={ntfyTopicInput}
                        onChange={(e) => {
                          setNtfyTopicInput(e.target.value)
                          const updated = saveNtfyConfig({ topic: e.target.value })
                          setNtfyConfig(updated)
                        }}
                        placeholder="e.g. personal-os-saad"
                        className="font-mono text-sm bg-background/80"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      title="Generate random topic"
                      onClick={() => {
                        const t = generateRandomTopic()
                        setNtfyTopicInput(t)
                        const updated = saveNtfyConfig({ topic: t })
                        setNtfyConfig(updated)
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      title="Copy topic name"
                      onClick={() => {
                        navigator.clipboard.writeText(ntfyConfig.topic)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }}
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <a
                      href={`${ntfyConfig.server || "https://ntfy.sh"}/${encodeURIComponent(ntfyConfig.topic)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium bg-muted hover:bg-muted/80 rounded-md border text-muted-foreground hover:text-foreground transition-colors"
                      title="Open web client"
                    >
                      <span>Web Viewer</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Subscribe to <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-mono">{ntfyConfig.topic}</code> in your ntfy phone app or web browser.
                  </p>
                </div>

                {/* Server & Auth Token row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        ntfy Server URL
                      </label>
                      <span className="text-[10px] text-muted-foreground">(Default: ntfy.sh)</span>
                    </div>
                    <Input
                      value={ntfyConfig.server}
                      onChange={(e) => {
                        const updated = saveNtfyConfig({ server: e.target.value })
                        setNtfyConfig(updated)
                      }}
                      placeholder="https://ntfy.sh"
                      className="font-mono text-xs bg-background/80 text-muted-foreground"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Key className="h-3 w-3 text-primary" />
                        <span>Access Token (Auth)</span>
                      </label>
                      <span className="text-[10px] text-emerald-400 font-medium">Configured</span>
                    </div>
                    <div className="relative">
                      <Input
                        type={showToken ? "text" : "password"}
                        value={ntfyConfig.token || ""}
                        onChange={(e) => {
                          const updated = saveNtfyConfig({ token: e.target.value })
                          setNtfyConfig(updated)
                        }}
                        placeholder="tk_..."
                        className="font-mono text-xs bg-background/80 pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(s => !s)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        title={showToken ? "Hide token" : "Show token"}
                      >
                        {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action button: Send test */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <Button
                    onClick={async () => {
                      setTesting(true)
                      setTestStatus(null)
                      const res = await sendNtfyNotification({
                        title: "🔔 Personal OS Test Alert",
                        message: `ntfy is connected! Testing topic: ${ntfyConfig.topic}`,
                        priority: 4,
                        tags: ["tada", "rocket", "bell"],
                      })
                      setTesting(false)
                      if (res.success) {
                        setTestStatus({ ok: true, msg: `Sent! Check your ntfy app or web viewer for topic '${ntfyConfig.topic}'` })
                      } else {
                        setTestStatus({ ok: false, msg: res.error || "Failed to send notification" })
                      }
                      setTimeout(() => setTestStatus(null), 6000)
                    }}
                    disabled={testing}
                    className="gap-2 text-xs font-medium"
                    size="sm"
                  >
                    <Send className={`h-3.5 w-3.5 ${testing ? "animate-spin" : ""}`} />
                    {testing ? "Sending..." : "Send Test Notification"}
                  </Button>

                  {testStatus && (
                    <span className={`text-xs px-2.5 py-1 rounded-md border ${
                      testStatus.ok
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                        : "bg-red-500/10 text-red-400 border-red-500/25"
                    }`}>
                      {testStatus.msg}
                    </span>
                  )}
                </div>
              </div>

              {/* Step-by-step help card */}
              <div className="p-3 bg-muted/40 rounded-lg border border-border/40 text-xs text-muted-foreground space-y-1.5">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Smartphone className="h-3.5 w-3.5 text-primary" />
                  <span>How to receive alerts on your phone:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>Install the free <strong>ntfy</strong> app from Google Play or App Store</li>
                  <li>Tap <strong>+</strong> and subscribe to topic: <span className="font-mono text-primary">{ntfyConfig.topic}</span></li>
                  <li>Whenever your focus timer ends or tasks trigger, your phone will buzz!</li>
                </ol>
              </div>
            </div>

            {/* Notification triggers */}
            <div className="bg-card border rounded-xl px-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3 border-b border-border/40">
                Trigger Alerts
              </h3>
              <SettingsRow label="Focus Mode Alerts" description="Timer alerts on session completion and phase changes">
                <Toggle
                  enabled={ntfyConfig.events.focusMode}
                  onToggle={() => {
                    const updated = saveNtfyConfig({
                      events: { ...ntfyConfig.events, focusMode: !ntfyConfig.events.focusMode }
                    })
                    setNtfyConfig(updated)
                  }}
                />
              </SettingsRow>
              <SettingsRow label="Task Reminders" description="Get notified about upcoming and overdue tasks">
                <Toggle
                  enabled={ntfyConfig.events.taskReminders}
                  onToggle={() => {
                    const updated = saveNtfyConfig({
                      events: { ...ntfyConfig.events, taskReminders: !ntfyConfig.events.taskReminders }
                    })
                    setNtfyConfig(updated)
                  }}
                />
              </SettingsRow>
              <SettingsRow label="Habit Reminders" description="Daily reminders to check in on your habits">
                <Toggle
                  enabled={ntfyConfig.events.habitReminders}
                  onToggle={() => {
                    const updated = saveNtfyConfig({
                      events: { ...ntfyConfig.events, habitReminders: !ntfyConfig.events.habitReminders }
                    })
                    setNtfyConfig(updated)
                  }}
                />
              </SettingsRow>
              <SettingsRow label="Calendar Alerts" description="Alerts for upcoming events (15 min before)">
                <Toggle
                  enabled={ntfyConfig.events.calendarAlerts}
                  onToggle={() => {
                    const updated = saveNtfyConfig({
                      events: { ...ntfyConfig.events, calendarAlerts: !ntfyConfig.events.calendarAlerts }
                    })
                    setNtfyConfig(updated)
                  }}
                />
              </SettingsRow>
              <SettingsRow label="Daily Quote & Summary" description="Motivational quote on the Dashboard each morning">
                <Toggle
                  enabled={ntfyConfig.events.dailyQuote}
                  onToggle={() => {
                    const updated = saveNtfyConfig({
                      events: { ...ntfyConfig.events, dailyQuote: !ntfyConfig.events.dailyQuote }
                    })
                    setNtfyConfig(updated)
                  }}
                />
              </SettingsRow>
            </div>
          </div>
        )}

        {/* ── Integrations: Google Assistant & Google Calendar ── */}
        {activeSection === "integrations" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Integrations & Voice</h2>
              <p className="text-sm text-muted-foreground">
                Connect <strong className="text-foreground">Google Assistant</strong> for voice control and <strong className="text-foreground">Google Calendar</strong> for 2-way sync.
              </p>
            </div>

            {/* 1. Google Assistant Card */}
            <div className="bg-gradient-to-br from-card via-card to-primary/5 border border-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
                    <Mic className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">Google Assistant Voice Webhook</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium border bg-emerald-500/15 text-emerald-400 border-emerald-500/30 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active & Ready
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Natural language speech parser for tasks, events, and schedules with Turso persistence & ntfy alerts
                    </p>
                  </div>
                </div>
              </div>

              {/* Webhook URL row */}
              <div className="grid gap-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
                  Voice Webhook URL
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={typeof window !== "undefined" ? `${window.location.origin}/api/assistant/webhook` : "http://localhost:3000/api/assistant/webhook"}
                    className="font-mono text-xs bg-background/80"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 h-9"
                    onClick={() => {
                      const url = `${window.location.origin}/api/assistant/webhook`
                      navigator.clipboard.writeText(url)
                      setCopiedWebhook(true)
                      setTimeout(() => setCopiedWebhook(false), 2000)
                    }}
                  >
                    {copiedWebhook ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedWebhook ? "Copied" : "Copy URL"}</span>
                  </Button>
                </div>
              </div>

              {/* Live Voice Command Simulator */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Interactive Voice Command Simulator</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">Test queries instantly</span>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    value={voiceInput}
                    onChange={e => setVoiceInput(e.target.value)}
                    placeholder="e.g. Hey Google, add a task buy groceries tomorrow urgent"
                    className="text-xs bg-background"
                    onKeyDown={e => {
                      if (e.key === "Enter") handleRunVoice()
                    }}
                  />
                  <Button
                    size="sm"
                    disabled={voiceRunning || !voiceInput.trim()}
                    onClick={() => handleRunVoice()}
                    className="shrink-0 gap-1.5 text-xs h-9"
                  >
                    <Mic className={`h-3.5 w-3.5 ${voiceRunning ? "animate-pulse text-red-400" : ""}`} />
                    <span>{voiceRunning ? "Processing..." : "Run Command"}</span>
                  </Button>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <span className="text-[11px] text-muted-foreground mr-1 self-center">Try:</span>
                  {[
                    "Add task buy groceries today urgent",
                    "Schedule team standup tomorrow at 10am",
                    "What are my tasks for today?",
                    "Add a task review quarterly roadmap tomorrow high priority",
                  ].map(sample => (
                    <button
                      key={sample}
                      onClick={() => {
                        setVoiceInput(sample)
                        handleRunVoice(sample)
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-background border border-border/80 hover:border-primary/50 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      &quot;{sample}&quot;
                    </button>
                  ))}
                </div>

                {/* Voice Output Display */}
                {voiceResult && (
                  <div className={`p-3 rounded-lg border text-xs space-y-1.5 animate-in fade-in duration-200 ${
                    voiceResult.success
                      ? "bg-primary/5 border-primary/25 text-foreground"
                      : "bg-red-500/10 border-red-500/20 text-red-400"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold flex items-center gap-1.5 text-primary">
                        <Volume2 className="h-3.5 w-3.5" />
                        <span>Google Assistant Spoken Response:</span>
                      </span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted">
                        {voiceResult.intent || (voiceResult.success ? "Success" : "Error")}
                      </span>
                    </div>
                    <p className="italic text-foreground font-medium pl-5">&quot;{voiceResult.speech}&quot;</p>

                    {voiceResult.task && (
                      <div className="pl-5 pt-1 text-[11px] text-muted-foreground flex items-center gap-2">
                        <span className="text-emerald-400 font-semibold">✓ Task saved to Turso:</span>
                        <span>{voiceResult.task.title}</span>
                        <span className="bg-muted px-1.5 rounded text-[10px]">{voiceResult.task.priority}</span>
                        <span>Due: {voiceResult.task.dueDate}</span>
                      </div>
                    )}

                    {voiceResult.event && (
                      <div className="pl-5 pt-1 text-[11px] text-muted-foreground flex items-center gap-2">
                        <span className="text-emerald-400 font-semibold">✓ Event saved to Turso:</span>
                        <span>{voiceResult.event.title}</span>
                        <span>Date: {voiceResult.event.date}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Setup Instructions for Google Assistant Routines */}
              <div className="p-3 bg-muted/40 rounded-lg border border-border/40 text-xs text-muted-foreground space-y-2">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                  <span>How to connect with Google Assistant on your phone:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px]">
                  <li>Open <strong>Google Assistant</strong> on your phone and tap <strong>Settings &gt; Routines &gt; + New Routine</strong>.</li>
                  <li>Set the Voice Starter to: <code className="bg-muted px-1 py-0.5 rounded text-primary">Personal OS $</code> or <code className="bg-muted px-1 py-0.5 rounded text-primary">Add task $</code>.</li>
                  <li>Set the Action to trigger a Webhook (using Google Assistant Shortcuts, IFTTT Webhooks, or Tasker) targeting your Personal OS Webhook URL.</li>
                  <li>Method: <strong className="text-foreground">POST</strong> with JSON body: <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono">{`{"query": "$"}`}</code>.</li>
                  <li>Every task and event you speak will automatically sync to Turso and alert your phone via ntfy!</li>
                </ol>
              </div>
            </div>

            {/* 2. Google Calendar Card */}
            <div className="bg-gradient-to-br from-card via-card to-blue-500/5 border border-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
                    <CalendarIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">Google Calendar 2-Way Integration</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium border bg-blue-500/15 text-blue-400 border-blue-500/30">
                        RFC 5545 iCal & 2-Way Sync
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Subscribe via live iCalendar feed or perform 2-way event synchronization with your Google account
                    </p>
                  </div>
                </div>
              </div>

              {/* Live iCal Feed */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-blue-400" />
                    <span>Live iCal (.ics) Subscription Feed</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add this live URL to Google Calendar once, and all your Personal OS events will automatically appear on your phone and calendar apps.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={typeof window !== "undefined" ? `${window.location.origin}/api/calendar/feed` : "http://localhost:3000/api/calendar/feed"}
                    className="font-mono text-xs bg-background h-8"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const url = `${window.location.origin}/api/calendar/feed`
                      navigator.clipboard.writeText(url)
                      setCopiedFeed(true)
                      setTimeout(() => setCopiedFeed(false), 2000)
                    }}
                    className="h-8 px-2.5 shrink-0"
                    title="Copy feed URL"
                  >
                    {copiedFeed ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <a
                    href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>Open &quot;Add Calendar by URL&quot; in Google Calendar</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <span className="text-[11px] text-muted-foreground">RFC 5545 Spec</span>
                </div>
              </div>

              {/* Direct 2-Way Sync */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Direct Two-Way Sync (via Google Apps Script)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Bi-directional sync that exports your Personal OS events to your Google Calendar and imports Google Calendar events into Turso.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    onClick={handleSyncCalendar}
                    disabled={calSyncing}
                    className="gap-2 text-xs"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${calSyncing ? "animate-spin" : ""}`} />
                    <span>{calSyncing ? "Syncing Calendar..." : "Sync Google Calendar Now"}</span>
                  </Button>

                  {calSyncResult && (
                    <span className={`text-xs px-2.5 py-1 rounded-md border ${
                      calSyncResult.success
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/25"
                    }`}>
                      {calSyncResult.msg}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Turso LibSQL Edge Database & Cloud Storage ── */}
        {activeSection === "storage" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Turso Backend & Storage</h2>
              <p className="text-sm text-muted-foreground">
                Personal OS runs natively on a distributed <strong className="text-foreground">Turso LibSQL Edge Database</strong> with 24/7 availability, zero cold starts, and instant auto-save.
              </p>
            </div>

            {/* Turso Edge Connection Status Card */}
            <div className="bg-gradient-to-br from-card via-card to-primary/10 border border-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-sm">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">Turso LibSQL Edge Database</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border flex items-center gap-1.5 ${
                        tursoHealth?.connected
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : tursoHealth?.status === "connected"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          tursoHealth?.connected || tursoHealth?.status === "connected"
                            ? "bg-emerald-400 animate-pulse"
                            : "bg-amber-400"
                        }`} />
                        {tursoHealth?.connected || tursoHealth?.status === "connected"
                          ? `Connected & Active (${tursoHealth.latencyMs ?? 18}ms)`
                          : "Connecting to Edge..."}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Direct distributed LibSQL edge replica — 24/7 uptime, sub-25ms response time</p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={tursoTesting}
                  onClick={fetchTursoHealth}
                  className="gap-1.5 text-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${tursoTesting ? "animate-spin" : ""}`} />
                  <span>{tursoTesting ? "Pinging..." : "Test Latency"}</span>
                </Button>
              </div>

              {/* Database Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                    <Server className="h-3.5 w-3.5 text-primary" />
                    <span>Database Host (URL)</span>
                  </div>
                  <p className="font-mono text-[11px] text-foreground truncate">
                    personal-os-saad19.aws-ap-south-1.turso.io
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                    <Globe className="h-3.5 w-3.5 text-primary" />
                    <span>Edge Region & Architecture</span>
                  </div>
                  <p className="font-medium text-foreground">
                    aws-ap-south-1 (Mumbai) · Edge Replicated
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                    <Cpu className="h-3.5 w-3.5 text-primary" />
                    <span>Database Engine</span>
                  </div>
                  <p className="font-medium text-foreground">
                    LibSQL SQLite {tursoHealth?.info?.sqliteVersion || "3.47.0"}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                    <Zap className="h-3.5 w-3.5 text-primary" />
                    <span>Availability & SLA</span>
                  </div>
                  <p className="font-medium text-emerald-400">
                    24/7 Always On · Zero Sleep/Pausing
                  </p>
                </div>
              </div>

              {/* Live Collection Record Counts */}
              <div className="pt-2 border-t border-border/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    <span>Turso Collections & Live Record Counts</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {tursoHealth?.info?.collections
                      ? `${Object.values(tursoHealth.info.collections).reduce((a, b) => a + b, 0)} total records in DB`
                      : "Loading counts..."}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {Object.entries({
                    tasks: "Tasks",
                    projects: "Projects",
                    events: "Events",
                    notes: "Notes",
                    habits: "Habits",
                    goals: "Goals",
                    journal: "Journal",
                    whiteboards: "Whiteboards",
                    bookmarks: "Bookmarks",
                    files: "Files",
                    users: "User Profile",
                  }).map(([key, label]) => {
                    const count = tursoHealth?.info?.collections?.[key] ?? 0
                    return (
                      <div key={key} className="flex items-center justify-between p-2 rounded-md bg-background/60 border border-border/40">
                        <span className="text-muted-foreground text-[11px]">{label}</span>
                        <span className="font-mono font-semibold text-primary px-1.5 py-0.5 rounded bg-primary/10 text-[11px]">
                          {count}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Auto-Save & Manual Flush Button */}
              <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  <span>Auto-save engine active: Changes persist automatically with a 700ms debounce.</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await flushPending()
                    await fetchTursoHealth()
                  }}
                  className="gap-1.5 text-xs shrink-0"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Flush & Sync Now</span>
                </Button>
              </div>
            </div>

            {/* Optional Google Drive Mirror & Cloud Backup Card */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground">
                    <HardDrive className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">Google Drive Secondary Mirror & Backup</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border flex items-center gap-1.5 ${
                        gasHealth?.connected
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : gasHealth?.configured
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          : "bg-muted text-muted-foreground border-border"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          gasHealth?.connected ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"
                        }`} />
                        {gasHealth?.connected
                          ? `Connected (${gasHealth.latencyMs}ms)`
                          : gasHealth?.configured
                          ? "Offline Archive"
                          : "Optional Mirror"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Optional secondary snapshot mirror to Google Drive via Google Apps Script</p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={gasTesting}
                  onClick={async () => {
                    setGasTesting(true)
                    const res = await checkDriveHealth({ gasUrl, gasKey })
                    setGasHealth(res)
                    setGasTesting(false)
                  }}
                  className="gap-1.5 text-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${gasTesting ? "animate-spin" : ""}`} />
                  <span>{gasTesting ? "Checking..." : "Test Drive Sync"}</span>
                </Button>
              </div>

              {/* GAS Configuration Inputs */}
              <div className="grid gap-3 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Google Apps Script Web App URL
                    </label>
                    <span className="text-[11px] text-muted-foreground">Ends in /exec</span>
                  </div>
                  <Input
                    value={gasUrl}
                    onChange={(e) => setGasUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="font-mono text-xs bg-background/80"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Key className="h-3 w-3 text-primary" />
                      <span>Script Secret API Key</span>
                    </label>
                    <span className="text-[11px] text-muted-foreground">Matches Code.gs secret</span>
                  </div>
                  <div className="relative">
                    <Input
                      type={showGasKey ? "text" : "password"}
                      value={gasKey}
                      onChange={(e) => setGasKey(e.target.value)}
                      placeholder="personal_os_secret_key_2026"
                      className="font-mono text-xs bg-background/80 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGasKey(s => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      title={showGasKey ? "Hide key" : "Show key"}
                    >
                      {showGasKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <Button
                    size="sm"
                    onClick={() => saveGasConfig(gasUrl, gasKey)}
                    className="gap-1.5 text-xs"
                  >
                    {gasSaved ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Saved!</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Save Credentials</span>
                      </>
                    )}
                  </Button>

                  {gasHealth && !gasHealth.connected && (
                    <span className="text-xs text-muted-foreground">
                      Primary backend is Turso. Google Drive mirror is optional.
                    </span>
                  )}
                </div>
              </div>

              {/* Action Operations: Init Storage & Backup */}
              <div className="pt-3 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-muted/30 border border-border/50 rounded-lg flex flex-col justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-semibold flex items-center gap-1.5">
                      <FolderSync className="h-3.5 w-3.5 text-primary" />
                      <span>Initialize Drive Folders</span>
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Auto-creates &apos;Personal OS&apos; folder and collection JSON mirror files in your Google Drive.
                    </p>
                  </div>
                  <div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={gasInitializing || !gasUrl}
                      onClick={async () => {
                        setGasInitializing(true)
                        setGasInitResult(null)
                        const res = await initializeDriveStorage({ gasUrl, gasKey })
                        setGasInitializing(false)
                        if (res.success) {
                          setGasInitResult(`Initialized ${res.initializedFiles?.length || 13} collection files in Drive!`)
                        } else {
                          setGasInitResult(`Error: ${res.error || "Initialization failed"}`)
                        }
                        setTimeout(() => setGasInitResult(null), 8000)
                      }}
                      className="w-full text-xs h-8"
                    >
                      {gasInitializing ? "Initializing..." : "Initialize Drive Folders"}
                    </Button>
                    {gasInitResult && (
                      <p className="text-[10px] mt-1 text-primary">{gasInitResult}</p>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-muted/30 border border-border/50 rounded-lg flex flex-col justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-semibold flex items-center gap-1.5">
                      <Download className="h-3.5 w-3.5 text-primary" />
                      <span>Create Drive Backup Snapshot</span>
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Takes an atomic snapshot of current Turso collections and saves it to Drive backups/.
                    </p>
                  </div>
                  <div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={gasBackupLoading || !gasUrl}
                      onClick={async () => {
                        setGasBackupLoading(true)
                        setGasBackupResult(null)
                        const res = await createDriveBackup({ gasUrl, gasKey })
                        setGasBackupLoading(false)
                        if (res.success) {
                          setGasBackupResult(`Snapshot created: ${res.backupFileName}`)
                        } else {
                          setGasBackupResult(`Error: ${res.error || "Backup failed"}`)
                        }
                        setTimeout(() => setGasBackupResult(null), 8000)
                      }}
                      className="w-full text-xs h-8"
                    >
                      {gasBackupLoading ? "Creating Backup..." : "Create Backup Snapshot"}
                    </Button>
                    {gasBackupResult && (
                      <p className="text-[10px] mt-1 text-primary">{gasBackupResult}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Architecture Overview */}
            <div className="bg-card border rounded-xl p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Full-Stack Backend Architecture
              </h3>
              <div className="font-mono text-xs bg-muted/30 p-3 rounded-lg border border-border/50 text-muted-foreground space-y-1">
                <p className="text-foreground font-semibold">⚡ Personal OS Modern Edge Stack</p>
                <p className="pl-4">├── 🟢 <span className="text-foreground">Turso LibSQL Edge Database</span> <span className="text-emerald-400 font-medium">(Primary · 24/7 Live · Sub-25ms Latency)</span></p>
                <p className="pl-8">└── Endpoint: <span className="text-primary">libsql://personal-os-saad19.aws-ap-south-1.turso.io</span></p>
                <p className="pl-4">├── ⚡ <span className="text-foreground">Optimistic Client Cache</span> <span className="text-muted-foreground/80">(0ms UI latency + 700ms debounce auto-save)</span></p>
                <p className="pl-4">├── 🔔 <span className="text-foreground">ntfy.sh Push Notifications</span> <span className="text-muted-foreground/80">(Mobile phone & browser dispatch)</span></p>
                <p className="pl-4">└── 📁 <span className="text-foreground">Google Drive Archive (Optional)</span> <span className="text-muted-foreground/80">(Zero-cost JSON backups & file attachments)</span></p>
              </div>
            </div>
          </div>
        )}

        {/* ── Shortcuts ── */}
        {activeSection === "shortcuts" && (
          <div>
            <h2 className="text-xl font-bold mb-1">Keyboard Shortcuts</h2>
            <p className="text-sm text-muted-foreground mb-6">Speed up your workflow with these shortcuts</p>

            <div className="bg-card border rounded-xl overflow-hidden">
              {SHORTCUTS.map(({ action, keys }) => (
                <div key={action} className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                  <span className="text-sm">{action}</span>
                  <div className="flex items-center gap-1">
                    {keys.map((k, i) => (
                      <span key={i} className="bg-muted border border-border/80 rounded px-2 py-0.5 text-xs font-mono font-medium">{k}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Privacy ── */}
        {activeSection === "privacy" && (
          <div>
            <h2 className="text-xl font-bold mb-1">Privacy & Security</h2>
            <p className="text-sm text-muted-foreground mb-6">Control your data and privacy preferences</p>

            <div className="bg-card border rounded-xl px-5 mb-6">
              <SettingsRow label="Analytics Tracking" description="Allow anonymous usage analytics to improve the app">
                <Toggle
                  enabled={user.preferences?.analyticsTracking ?? false}
                  onToggle={() => updatePreferences({ analyticsTracking: !(user.preferences?.analyticsTracking ?? false) })}
                />
              </SettingsRow>
              <SettingsRow label="Crash Reports" description="Automatically send crash reports to help fix bugs">
                <Toggle
                  enabled={user.preferences?.crashReports ?? true}
                  onToggle={() => updatePreferences({ crashReports: !(user.preferences?.crashReports ?? true) })}
                />
              </SettingsRow>
            </div>

            <div className="flex flex-col gap-3">
              <div className="bg-card border rounded-xl p-5">
                <h3 className="font-medium text-sm mb-1">Export Your Data</h3>
                <p className="text-xs text-muted-foreground mb-3">Download all your data in JSON format</p>
                <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" /> Export Data</Button>
              </div>
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
                <h3 className="font-medium text-sm mb-1 text-red-400">Danger Zone</h3>
                <p className="text-xs text-muted-foreground mb-3">These actions are irreversible. Proceed with caution.</p>
                <Button variant="destructive" size="sm" className="gap-2">Delete Account</Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

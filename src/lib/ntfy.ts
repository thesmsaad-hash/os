export interface NtfyConfig {
  enabled: boolean
  server: string
  topic: string
  token?: string
  events: {
    focusMode: boolean
    taskReminders: boolean
    habitReminders: boolean
    calendarAlerts: boolean
    dailyQuote: boolean
  }
}

export interface NtfySendOptions {
  title?: string
  message: string
  priority?: 1 | 2 | 3 | 4 | 5
  tags?: string[]
  click?: string
  actions?: Array<{
    action: "view" | "http" | "broadcast"
    label: string
    url?: string
  }>
  topic?: string
  server?: string
  eventType?: keyof NtfyConfig["events"]
}

export interface NotificationLogItem {
  id: string
  title: string
  message: string
  timestamp: string
  topic: string
  tags?: string[]
}

const STORAGE_KEY = "personal_os_ntfy_config"
const LOGS_KEY = "personal_os_ntfy_logs"

export const DEFAULT_NTFY_CONFIG: NtfyConfig = {
  enabled: true,
  server: "https://ntfy.sh",
  topic: "personal-os-saad",
  token: "tk_eq6wkwwicwmc7gdmeroqx50he0n8p",
  events: {
    focusMode: true,
    taskReminders: true,
    habitReminders: true,
    calendarAlerts: true,
    dailyQuote: false,
  },
}

export function getNtfyConfig(): NtfyConfig {
  if (typeof window === "undefined") return DEFAULT_NTFY_CONFIG
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_NTFY_CONFIG))
      return DEFAULT_NTFY_CONFIG
    }
    const parsed = JSON.parse(raw)
    const token = parsed.token || DEFAULT_NTFY_CONFIG.token
    return {
      ...DEFAULT_NTFY_CONFIG,
      ...parsed,
      token,
      events: { ...DEFAULT_NTFY_CONFIG.events, ...(parsed.events || {}) },
    }
  } catch {
    return DEFAULT_NTFY_CONFIG
  }
}

export function saveNtfyConfig(partial: Partial<NtfyConfig>): NtfyConfig {
  if (typeof window === "undefined") return DEFAULT_NTFY_CONFIG
  const current = getNtfyConfig()
  const updated: NtfyConfig = {
    ...current,
    ...partial,
    events: {
      ...current.events,
      ...(partial.events || {}),
    },
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  window.dispatchEvent(new Event("ntfy-config-updated"))
  return updated
}

export function getNtfyLogs(): NotificationLogItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(LOGS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function appendNtfyLog(item: Omit<NotificationLogItem, "id" | "timestamp">) {
  if (typeof window === "undefined") return
  try {
    const logs = getNtfyLogs()
    const newLog: NotificationLogItem = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      ...item,
    }
    const updated = [newLog, ...logs].slice(0, 30)
    localStorage.setItem(LOGS_KEY, JSON.stringify(updated))
    window.dispatchEvent(new Event("ntfy-log-updated"))
  } catch {}
}

export function generateRandomTopic(prefix = "personal-os"): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let suffix = ""
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `${prefix}-${suffix}`
}

/**
 * Plays a pleasant web audio chime on completion
 */
export function playChime() {
  if (typeof window === "undefined") return
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime

    // 2-tone melodic chime (E5 -> A5)
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)

    osc1.type = "sine"
    osc1.frequency.setValueAtTime(659.25, now) // E5
    osc1.connect(gain)
    osc1.start(now)
    osc1.stop(now + 0.3)

    osc2.type = "sine"
    osc2.frequency.setValueAtTime(880, now + 0.2) // A5
    osc2.connect(gain)
    osc2.start(now + 0.2)
    osc2.stop(now + 0.8)
  } catch {}
}

/**
 * Send an ntfy notification
 */
export async function sendNtfyNotification(options: NtfySendOptions): Promise<{ success: boolean; error?: string }> {
  const config = getNtfyConfig()

  if (!config.enabled) {
    return { success: false, error: "ntfy notifications are disabled in settings" }
  }

  if (options.eventType && config.events[options.eventType] === false) {
    return { success: false, error: `Notification for '${options.eventType}' is toggled off` }
  }

  const server = (options.server || config.server || "https://ntfy.sh").replace(/\/+$/, "")
  const topic = (options.topic || config.topic || "personal-os-saad").trim()

  if (!topic) {
    return { success: false, error: "No ntfy topic configured" }
  }

  const url = `${server}/${encodeURIComponent(topic)}`

  const headers: Record<string, string> = {}
  if (options.title) headers["Title"] = options.title
  if (options.priority) headers["Priority"] = String(options.priority)
  if (options.tags && options.tags.length > 0) headers["Tags"] = options.tags.join(",")
  if (options.click) headers["Click"] = options.click
  if (options.actions && options.actions.length > 0) headers["Actions"] = JSON.stringify(options.actions)
  if (config.token) headers["Authorization"] = `Bearer ${config.token}`

  try {
    const res = await fetch(url, {
      method: "POST",
      body: options.message,
      headers,
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      return { success: false, error: `Server error ${res.status}: ${errText || res.statusText}` }
    }

    // Play local chime sound
    playChime()

    // Save to log
    appendNtfyLog({
      title: options.title || "Notification",
      message: options.message,
      topic,
      tags: options.tags,
    })

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch"
    return { success: false, error: message }
  }
}

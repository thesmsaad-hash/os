"use client"

import { create } from "zustand"
import { checkDriveHealth } from "../drive-api"
import { getOfflineQueueCount } from "../offline-queue"

export type SyncStatus = "synced" | "syncing" | "offline" | "error" | "unconfigured"

interface SyncState {
  status: SyncStatus
  isConfigured: boolean
  provider: string
  lastSyncedAt: string | null
  lastSavedFormatted: string
  latencyMs: number | null
  error: string | null
  pendingChanges: number

  checkStatus: () => Promise<boolean>
  markSaving: () => void
  markSaved: () => void
  markOffline: () => void
  markError: (error: string) => void
  startSync: () => void
  finishSync: () => void
  failSync: (error: string) => void
}

function formatTime(d = new Date()) {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: "unconfigured",
  isConfigured: false,
  provider: "Turso (LibSQL Edge)",
  lastSyncedAt: null,
  lastSavedFormatted: "Ready",
  latencyMs: null,
  error: null,
  pendingChanges: 0,

  checkStatus: async () => {
    const res = await checkDriveHealth()
    const offlineCount = getOfflineQueueCount()

    if (!res.configured) {
      set({
        status: "unconfigured",
        isConfigured: false,
        latencyMs: null,
        error: res.error || null,
        pendingChanges: offlineCount,
      })
      return false
    }

    if (res.connected) {
      const isPending = get().pendingChanges > 0 || offlineCount > 0
      set({
        status: isPending ? "syncing" : "synced",
        isConfigured: true,
        provider: res.provider || "Turso (LibSQL Edge)",
        latencyMs: res.latencyMs || null,
        error: null,
        lastSyncedAt: get().lastSyncedAt || new Date().toISOString(),
        lastSavedFormatted: `Saved ${formatTime()}`,
        pendingChanges: offlineCount,
      })
      return true
    } else {
      set({
        status: "offline",
        isConfigured: true,
        latencyMs: null,
        error: res.error || "Disconnected",
        pendingChanges: offlineCount,
      })
      return false
    }
  },

  markSaving: () => {
    set(state => ({
      status: "syncing",
      pendingChanges: state.pendingChanges + 1,
      lastSavedFormatted: "Saving...",
    }))
  },

  markSaved: () => {
    const now = new Date()
    set({
      status: "synced",
      pendingChanges: 0,
      lastSyncedAt: now.toISOString(),
      lastSavedFormatted: `Saved ${formatTime(now)}`,
      error: null,
    })
  },

  markOffline: () => {
    const count = getOfflineQueueCount()
    set({
      status: "offline",
      pendingChanges: count,
      lastSavedFormatted: count > 0 ? `${count} pending (Offline)` : "Offline",
    })
  },

  markError: (error: string) => {
    const count = getOfflineQueueCount()
    set({
      status: "error",
      error,
      pendingChanges: count,
      lastSavedFormatted: "Save error (retrying)",
    })
  },

  // Backward-compatible methods
  startSync: () => get().markSaving(),
  finishSync: () => get().markSaved(),
  failSync: (err: string) => get().markError(err),
}))

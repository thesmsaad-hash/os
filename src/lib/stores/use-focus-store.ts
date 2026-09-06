"use client"

import { create } from "zustand"
import type { FocusSession } from "../types/drive"
import { fetchCollection, saveCollection } from "../drive-api"
import { useSyncStore } from "./use-sync-store"

interface FocusState {
  sessions: FocusSession[]
  isLoading: boolean
  hasLoaded: boolean

  loadSessions: () => Promise<void>
  recordSession: (phase: FocusSession["phase"], mode: string, durationMinutes: number, taskId?: string) => Promise<void>
}

export const useFocusStore = create<FocusState>((set, get) => ({
  sessions: [],
  isLoading: false,
  hasLoaded: false,

  loadSessions: async () => {
    set({ isLoading: true })
    const sync = useSyncStore.getState()
    sync.startSync()

    try {
      const res = await fetchCollection<FocusSession>("focus", [])
      set({ sessions: res.items, isLoading: false, hasLoaded: true })
      sync.finishSync()
    } catch {
      set({ isLoading: false, hasLoaded: true })
      sync.failSync("Failed to load focus sessions")
    }
  },

  recordSession: async (phase, mode, durationMinutes, taskId) => {
    const newSession: FocusSession = {
      id: "foc_" + Math.random().toString(36).substring(2, 9),
      phase,
      mode,
      durationMinutes,
      timestamp: new Date().toISOString(),
      taskId,
    }

    const nextSessions = [newSession, ...get().sessions]
    set({ sessions: nextSessions })

    const sync = useSyncStore.getState()
    sync.startSync()
    const res = await saveCollection("focus", nextSessions)
    if (res.success) sync.finishSync()
    else sync.failSync(res.error || "Save focus session failed")
  },
}))

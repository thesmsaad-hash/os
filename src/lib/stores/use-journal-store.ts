"use client"

import { create } from "zustand"
import { fetchCollection, setLocalCache, getLocalCache } from "../drive-api"
import { scheduleItemUpsert, scheduleItemDelete } from "../sync-manager"

export type Mood = "great" | "good" | "okay" | "bad" | "awful"

export interface JournalEntry {
  id: string
  date: string
  content: string
  mood: Mood
  tags: string[]
  createdAt?: string
  updatedAt?: string
}

export const INITIAL_ENTRIES: JournalEntry[] = [
  {
    id: "j-1",
    date: "2026-09-06T09:00:00.000Z",
    mood: "good",
    content: "Today was productive overall. Got the client video draft reviewed and sent feedback. The edit is looking solid — color grading is the next big step.\n\nFelt a bit tired in the afternoon but pushed through with a focus session. Completed 3 pomodoros.\n\nGrateful for the clear weather and a good cup of coffee this morning. ☕",
    tags: ["productive", "client"],
    createdAt: "2026-09-06T09:00:00.000Z",
    updatedAt: "2026-09-06T09:00:00.000Z",
  },
  {
    id: "j-2",
    date: "2026-09-05T14:00:00.000Z",
    mood: "great",
    content: "Hit a major milestone on the YouTube tech series today! Scripted 3 full episodes and structured the visual assets. Feeling focused and energized.",
    tags: ["youtube", "creative", "milestone"],
    createdAt: "2026-09-05T14:00:00.000Z",
    updatedAt: "2026-09-05T14:00:00.000Z",
  },
  {
    id: "j-3",
    date: "2026-09-04T18:00:00.000Z",
    mood: "okay",
    content: "A slower day. Reorganized the workspace and cleaned up pending invoices. Took a longer evening walk to clear my head.",
    tags: ["reflection", "health"],
    createdAt: "2026-09-04T18:00:00.000Z",
    updatedAt: "2026-09-04T18:00:00.000Z",
  },
]

interface JournalState {
  entries: JournalEntry[]
  isLoading: boolean
  hasLoaded: boolean

  loadEntries: () => Promise<void>
  addEntry: (entry: Omit<JournalEntry, "id" | "createdAt" | "updatedAt">) => void
  updateEntry: (id: string, updates: Partial<JournalEntry>) => void
  deleteEntry: (id: string) => void
}

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: INITIAL_ENTRIES,
  isLoading: false,
  hasLoaded: false,

    loadEntries: async () => {
      set({ isLoading: true })
      try {
        const res = await fetchCollection<JournalEntry>("journal", INITIAL_ENTRIES)
        set({ entries: res.items, isLoading: false, hasLoaded: true })
      } catch {
        set({ isLoading: false, hasLoaded: true })
      }
    },

    addEntry: (data) => {
      const now = new Date().toISOString()
      const newEntry: JournalEntry = {
        ...data,
        id: `journal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      }

      const updated = [newEntry, ...get().entries]
      set({ entries: updated })
      setLocalCache("journal", updated)
      scheduleItemUpsert("journal", newEntry, 700)
    },

    updateEntry: (id, updates) => {
      const current = get().entries
      const entry = current.find(e => e.id === id)
      if (!entry) return

      const updatedEntry: JournalEntry = {
        ...entry,
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      const updated = current.map(e => e.id === id ? updatedEntry : e)
      set({ entries: updated })
      setLocalCache("journal", updated)
      scheduleItemUpsert("journal", updatedEntry, 700)
    },

    deleteEntry: (id) => {
      const updated = get().entries.filter(e => e.id !== id)
      set({ entries: updated })
      setLocalCache("journal", updated)
      scheduleItemDelete("journal", id)
    },
}))

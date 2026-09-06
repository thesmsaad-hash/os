"use client"

import { create } from "zustand"
import type { Note } from "../types/drive"
import { fetchCollection, setLocalCache } from "../drive-api"
import { useSyncStore } from "./use-sync-store"
import { scheduleAutoSave, scheduleItemUpsert, scheduleItemDelete } from "../sync-manager"

const INITIAL_NOTES: Note[] = [
  { id: "n1", title: "Project Architecture Notes", content: "Personal OS utilizes Google Apps Script + Google Drive JSON storage with Next.js 16.", tags: ["architecture", "dev"], pinned: true, createdAt: "2026-09-06T08:00:00.000Z", updatedAt: "2026-09-06T08:00:00.000Z" },
  { id: "n2", title: "Weekly Goals & Focus", content: "1. Complete Phase 1 foundation.\n2. Verify ntfy mobile alerts.\n3. Test LockService write throughput.", tags: ["goals"], pinned: false, createdAt: "2026-09-06T08:30:00.000Z", updatedAt: "2026-09-06T08:30:00.000Z" },
]

interface NoteState {
  notes: Note[]
  activeNoteId: string | null
  isLoading: boolean
  hasLoaded: boolean

  loadNotes: () => Promise<void>
  createNote: (note?: Partial<Note>) => Promise<Note>
  updateNote: (id: string, updates: Partial<Note>) => void
  deleteNote: (id: string) => Promise<void>
  setActiveNote: (id: string | null) => void
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: INITIAL_NOTES,
  activeNoteId: INITIAL_NOTES[0].id,
  isLoading: false,
  hasLoaded: false,

  loadNotes: async () => {
    set({ isLoading: true })
    const sync = useSyncStore.getState()
    sync.startSync()

    try {
      const res = await fetchCollection<Note>("notes", INITIAL_NOTES)
      set({ notes: res.items, isLoading: false, hasLoaded: true })
      sync.finishSync()
    } catch {
      set({ isLoading: false, hasLoaded: true })
      sync.failSync("Failed to load notes")
    }
  },

  createNote: async (noteInput = {}) => {
    const newNote: Note = {
      id: "note_" + Math.random().toString(36).substring(2, 9),
      title: noteInput.title || "Untitled Note",
      content: noteInput.content || "",
      tags: noteInput.tags || [],
      pinned: noteInput.pinned || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const nextNotes = [newNote, ...get().notes]
    set({ notes: nextNotes, activeNoteId: newNote.id })
    setLocalCache("notes", nextNotes)
    scheduleAutoSave("notes", nextNotes, 700)

    return newNote
  },

  updateNote: (id, updates) => {
    let updatedNote: Note | undefined
    const nextNotes = get().notes.map(n => {
      if (n.id === id) {
        updatedNote = { ...n, ...updates, updatedAt: new Date().toISOString() }
        return updatedNote
      }
      return n
    })

    // 1. Update UI state immediately (zero lag on keystrokes)
    set({ notes: nextNotes })

    // 2. Persist locally immediately
    setLocalCache("notes", nextNotes)

    // 3. Debounce cloud save (700ms after last keystroke)
    if (updatedNote) {
      scheduleItemUpsert("notes", updatedNote, 700)
    } else {
      scheduleAutoSave("notes", nextNotes, 700)
    }
  },

  deleteNote: async (id) => {
    const nextNotes = get().notes.filter(n => n.id !== id)
    const active = get().activeNoteId === id ? (nextNotes[0]?.id || null) : get().activeNoteId
    set({ notes: nextNotes, activeNoteId: active })
    setLocalCache("notes", nextNotes)
    scheduleItemDelete("notes", id)
  },

  setActiveNote: (id) => set({ activeNoteId: id }),
}))

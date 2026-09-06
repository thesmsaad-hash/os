"use client"

import { create } from "zustand"
import { fetchCollection, setLocalCache, getLocalCache } from "../drive-api"
import { scheduleItemUpsert, scheduleItemDelete } from "../sync-manager"

export interface BookmarkItem {
  id: string
  url: string
  title: string
  description: string
  category: string
  tags: string[]
  favicon?: string
  isFavorite: boolean
  createdAt?: string
  updatedAt?: string
}

export const INITIAL_BOOKMARKS: BookmarkItem[] = [
  {
    id: "bm-1",
    url: "https://linear.app",
    title: "Linear",
    description: "Issue tracking for modern software teams. Beautiful, streamlined, and fast.",
    category: "Tools",
    tags: ["productivity", "pm"],
    isFavorite: true,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "bm-2",
    url: "https://v0.dev",
    title: "v0 by Vercel",
    description: "AI-powered UI generation from Vercel. Build UIs with natural language prompts.",
    category: "AI Tools",
    tags: ["ai", "ui", "design"],
    isFavorite: true,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "bm-3",
    url: "https://dribbble.com",
    title: "Dribbble",
    description: "Design inspiration community with curated shots from top designers worldwide.",
    category: "Inspiration",
    tags: ["design", "ui"],
    isFavorite: false,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "bm-4",
    url: "https://cursor.sh",
    title: "Cursor AI",
    description: "AI-first code editor built on VS Code. Incredibly powerful for development.",
    category: "AI Tools",
    tags: ["ai", "dev", "editor"],
    isFavorite: true,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "bm-5",
    url: "https://youtube.com/c/fireship",
    title: "Fireship",
    description: "High-intensity code tutorials. 100-second explanations of web technologies.",
    category: "Tutorials",
    tags: ["dev", "webdev"],
    isFavorite: false,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
]

interface BookmarkState {
  bookmarks: BookmarkItem[]
  isLoading: boolean
  hasLoaded: boolean

  loadBookmarks: () => Promise<void>
  addBookmark: (bookmark: Omit<BookmarkItem, "id" | "createdAt" | "updatedAt">) => void
  updateBookmark: (id: string, updates: Partial<BookmarkItem>) => void
  deleteBookmark: (id: string) => void
  toggleFavorite: (id: string) => void
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: INITIAL_BOOKMARKS,
  isLoading: false,
  hasLoaded: false,

    loadBookmarks: async () => {
      set({ isLoading: true })
      try {
        const res = await fetchCollection<BookmarkItem>("bookmarks", INITIAL_BOOKMARKS)
        set({ bookmarks: res.items, isLoading: false, hasLoaded: true })
      } catch {
        set({ isLoading: false, hasLoaded: true })
      }
    },

    addBookmark: (data) => {
      const now = new Date().toISOString()
      const newBookmark: BookmarkItem = {
        ...data,
        id: `bm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      }

      const updated = [newBookmark, ...get().bookmarks]
      set({ bookmarks: updated })
      setLocalCache("bookmarks", updated)
      scheduleItemUpsert("bookmarks", newBookmark, 700)
    },

    updateBookmark: (id, updates) => {
      const current = get().bookmarks
      const item = current.find(b => b.id === id)
      if (!item) return

      const updatedItem: BookmarkItem = {
        ...item,
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      const updated = current.map(b => b.id === id ? updatedItem : b)
      set({ bookmarks: updated })
      setLocalCache("bookmarks", updated)
      scheduleItemUpsert("bookmarks", updatedItem, 700)
    },

    deleteBookmark: (id) => {
      const updated = get().bookmarks.filter(b => b.id !== id)
      set({ bookmarks: updated })
      setLocalCache("bookmarks", updated)
      scheduleItemDelete("bookmarks", id)
    },

    toggleFavorite: (id) => {
      const item = get().bookmarks.find(b => b.id === id)
      if (!item) return
      get().updateBookmark(id, { isFavorite: !item.isFavorite })
    },
}))

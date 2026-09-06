"use client"

import { create } from "zustand"
import { fetchCollection, setLocalCache, getLocalCache } from "../drive-api"
import { scheduleItemUpsert, scheduleItemDelete } from "../sync-manager"

export type Tool =
  | "select" | "pen" | "eraser" | "rect" | "ellipse"
  | "line" | "arrow" | "text" | "sticky"

export interface Point { x: number; y: number }

export interface DrawElement {
  id: string
  type: Tool
  points?: Point[]
  x?: number
  y?: number
  w?: number
  h?: number
  x2?: number
  y2?: number
  color: string
  strokeW: number
  text?: string
  bgColor?: string
}

export interface Board {
  id: string
  name: string
  elements: DrawElement[]
  createdAt?: string
  updatedAt?: string
}

export const INITIAL_BOARDS: Board[] = [
  { id: "board-1", name: "Brainstorming", elements: [], createdAt: new Date().toISOString() },
  { id: "board-2", name: "Video Ideas", elements: [], createdAt: new Date().toISOString() },
  { id: "board-3", name: "Content Planning", elements: [], createdAt: new Date().toISOString() },
]

interface WhiteboardState {
  boards: Board[]
  activeBoardId: string
  isLoading: boolean
  hasLoaded: boolean

  setActiveBoardId: (id: string) => void
  loadBoards: () => Promise<void>
  addBoard: (name: string) => string
  updateBoardElements: (id: string, elements: DrawElement[]) => void
  renameBoard: (id: string, name: string) => void
  deleteBoard: (id: string) => void
}

export const useWhiteboardStore = create<WhiteboardState>((set, get) => ({
  boards: INITIAL_BOARDS,
  activeBoardId: INITIAL_BOARDS[0]?.id || "board-1",
  isLoading: false,
  hasLoaded: false,

    setActiveBoardId: (id) => set({ activeBoardId: id }),

    loadBoards: async () => {
      set({ isLoading: true })
      try {
        const res = await fetchCollection<Board>("whiteboards", INITIAL_BOARDS)
        const boards = res.items.length > 0 ? res.items : INITIAL_BOARDS
        set({
          boards,
          isLoading: false,
          hasLoaded: true,
          activeBoardId: boards[0]?.id || "board-1",
        })
      } catch {
        set({ isLoading: false, hasLoaded: true })
      }
    },

    addBoard: (name) => {
      const now = new Date().toISOString()
      const newBoard: Board = {
        id: `board_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: name.trim() || "Untitled Board",
        elements: [],
        createdAt: now,
        updatedAt: now,
      }

      const updated = [...get().boards, newBoard]
      set({ boards: updated, activeBoardId: newBoard.id })
      setLocalCache("whiteboards", updated)
      scheduleItemUpsert("whiteboards", newBoard, 1200)
      return newBoard.id
    },

    updateBoardElements: (id, elements) => {
      const current = get().boards
      const board = current.find(b => b.id === id)
      if (!board) return

      const updatedBoard: Board = {
        ...board,
        elements,
        updatedAt: new Date().toISOString(),
      }

      const updated = current.map(b => b.id === id ? updatedBoard : b)
      set({ boards: updated })
      setLocalCache("whiteboards", updated)
      // Debounce whiteboard drawing saves at 1500ms so drawing is smooth without spamming
      scheduleItemUpsert("whiteboards", updatedBoard, 1500)
    },

    renameBoard: (id, name) => {
      const current = get().boards
      const board = current.find(b => b.id === id)
      if (!board) return

      const updatedBoard: Board = { ...board, name, updatedAt: new Date().toISOString() }
      const updated = current.map(b => b.id === id ? updatedBoard : b)
      set({ boards: updated })
      setLocalCache("whiteboards", updated)
      scheduleItemUpsert("whiteboards", updatedBoard, 700)
    },

    deleteBoard: (id) => {
      const current = get().boards
      if (current.length <= 1) return // keep at least 1 board
      const updated = current.filter(b => b.id !== id)
      const nextActive = get().activeBoardId === id ? updated[0].id : get().activeBoardId

      set({ boards: updated, activeBoardId: nextActive })
      setLocalCache("whiteboards", updated)
      scheduleItemDelete("whiteboards", id)
    },
}))

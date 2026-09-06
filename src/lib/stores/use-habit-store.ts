"use client"

import { create } from "zustand"
import type { Habit } from "../types/drive"
import { fetchCollection, setLocalCache } from "../drive-api"
import { useSyncStore } from "./use-sync-store"
import { scheduleAutoSave, scheduleItemUpsert, scheduleItemDelete } from "../sync-manager"

const INITIAL_HABITS: Habit[] = [
  { id: "h1", name: "Morning Meditation", frequency: "daily", streak: 5, bestStreak: 14, completedDates: ["2026-09-05", "2026-09-04", "2026-09-03"] },
  { id: "h2", name: "Read 20 Pages", frequency: "daily", streak: 8, bestStreak: 12, completedDates: ["2026-09-05", "2026-09-04"] },
  { id: "h3", name: "Deep Work (2+ hrs)", frequency: "daily", streak: 12, bestStreak: 20, completedDates: ["2026-09-05", "2026-09-04", "2026-09-03"] },
]

interface HabitState {
  habits: Habit[]
  isLoading: boolean
  hasLoaded: boolean

  loadHabits: () => Promise<void>
  addHabit: (name: string, frequency?: "daily" | "weekly") => Promise<void>
  toggleHabitToday: (id: string) => Promise<void>
  toggleHabit: (id: string) => Promise<void>
  deleteHabit: (id: string) => Promise<void>
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: INITIAL_HABITS,
  isLoading: false,
  hasLoaded: false,

  loadHabits: async () => {
    set({ isLoading: true })
    const sync = useSyncStore.getState()
    sync.startSync()

    try {
      const res = await fetchCollection<Habit>("habits", INITIAL_HABITS)
      set({ habits: res.items, isLoading: false, hasLoaded: true })
      sync.finishSync()
    } catch {
      set({ isLoading: false, hasLoaded: true })
      sync.failSync("Failed to load habits")
    }
  },

  addHabit: async (name, frequency = "daily") => {
    const newHabit: Habit = {
      id: "habit_" + Math.random().toString(36).substring(2, 9),
      name,
      frequency,
      streak: 0,
      bestStreak: 0,
      completedDates: [],
      createdAt: new Date().toISOString(),
    }
    const nextHabits = [...get().habits, newHabit]
    set({ habits: nextHabits })
    setLocalCache("habits", nextHabits)
    scheduleAutoSave("habits", nextHabits, 700)
  },

  toggleHabitToday: async (id) => {
    const today = new Date().toISOString().split("T")[0]
    const habit = get().habits.find(h => h.id === id)
    if (!habit) return

    const isCompleted = habit.completedDates.includes(today)
    const newCompletedDates = isCompleted
      ? habit.completedDates.filter(d => d !== today)
      : [...habit.completedDates, today]

    const newStreak = isCompleted ? Math.max(0, habit.streak - 1) : habit.streak + 1
    const newBest = Math.max(habit.bestStreak, newStreak)

    const updates = {
      completedDates: newCompletedDates,
      streak: newStreak,
      bestStreak: newBest,
    }

    let updatedHabit: Habit | undefined
    const nextHabits = get().habits.map(h => {
      if (h.id === id) {
        updatedHabit = { ...h, ...updates }
        return updatedHabit
      }
      return h
    })

    set({ habits: nextHabits })
    setLocalCache("habits", nextHabits)

    if (updatedHabit) {
      scheduleItemUpsert("habits", updatedHabit, 700)
    } else {
      scheduleAutoSave("habits", nextHabits, 700)
    }
  },

  toggleHabit: async (id) => {
    return get().toggleHabitToday(id)
  },

  deleteHabit: async (id) => {
    const nextHabits = get().habits.filter(h => h.id !== id)
    set({ habits: nextHabits })
    setLocalCache("habits", nextHabits)
    scheduleItemDelete("habits", id)
  },
}))

"use client"

import { create } from "zustand"
import type { CalendarEvent } from "../types/drive"
import { fetchCollection, setLocalCache } from "../drive-api"
import { useSyncStore } from "./use-sync-store"
import { scheduleAutoSave, scheduleItemUpsert, scheduleItemDelete } from "../sync-manager"

const INITIAL_EVENTS: CalendarEvent[] = [
  { id: "e1", title: "Product Strategy Meeting", start: "2026-09-06T10:00:00.000Z", end: "2026-09-06T11:00:00.000Z", category: "work", color: "#8b5cf6" },
  { id: "e2", title: "Gym Workout", start: "2026-09-06T17:30:00.000Z", end: "2026-09-06T18:30:00.000Z", category: "health", color: "#10b981" },
  { id: "e3", title: "Personal OS Architecture Review", start: "2026-09-07T14:00:00.000Z", end: "2026-09-07T15:00:00.000Z", category: "work", color: "#3b82f6" },
]

interface CalendarState {
  events: CalendarEvent[]
  isLoading: boolean
  hasLoaded: boolean

  loadEvents: () => Promise<void>
  addEvent: (event: Omit<CalendarEvent, "id">) => Promise<CalendarEvent>
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: INITIAL_EVENTS,
  isLoading: false,
  hasLoaded: false,

  loadEvents: async () => {
    set({ isLoading: true })
    const sync = useSyncStore.getState()
    sync.startSync()

    try {
      const res = await fetchCollection<CalendarEvent>("events", INITIAL_EVENTS)
      set({ events: res.items, isLoading: false, hasLoaded: true })
      sync.finishSync()
    } catch {
      set({ isLoading: false, hasLoaded: true })
      sync.failSync("Failed to load events")
    }
  },

  addEvent: async (eventInput) => {
    const newEvent: CalendarEvent = {
      ...eventInput,
      id: "evt_" + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    }
    const nextEvents = [...get().events, newEvent]
    set({ events: nextEvents })
    setLocalCache("events", nextEvents)
    scheduleAutoSave("events", nextEvents, 700)

    return newEvent
  },

  updateEvent: async (id, updates) => {
    let updatedEvent: CalendarEvent | undefined
    const nextEvents = get().events.map(e => {
      if (e.id === id) {
        updatedEvent = { ...e, ...updates, updatedAt: new Date().toISOString() }
        return updatedEvent
      }
      return e
    })
    set({ events: nextEvents })
    setLocalCache("events", nextEvents)

    if (updatedEvent) {
      scheduleItemUpsert("events", updatedEvent, 700)
    } else {
      scheduleAutoSave("events", nextEvents, 700)
    }
  },

  deleteEvent: async (id) => {
    const nextEvents = get().events.filter(e => e.id !== id)
    set({ events: nextEvents })
    setLocalCache("events", nextEvents)
    scheduleItemDelete("events", id)
  },
}))

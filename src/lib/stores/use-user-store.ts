"use client"

import { create } from "zustand"
import { fetchCollection, setLocalCache, getLocalCache } from "../drive-api"
import { scheduleAutoSave, scheduleItemUpsert } from "../sync-manager"
import { useSyncStore } from "./use-sync-store"

export interface UserPreferences {
  compactMode?: boolean
  animations: boolean
  showGreeting: boolean
  analyticsTracking: boolean
  crashReports: boolean
}

export interface UserProfile {
  id: string
  name: string
  email: string
  timezone: string
  plan: string
  avatar?: string
  city?: string
  temperature?: string
  condition?: string
  weatherText?: string
  temperatureUnit?: "celsius" | "fahrenheit"
  preferences: UserPreferences
  updatedAt?: string
}

export const DEFAULT_USER: UserProfile = {
  id: "user_primary",
  name: "Saad",
  email: "saad@example.com",
  timezone: "Asia/Kolkata",
  plan: "Pro Plan",
  city: "Bengaluru",
  temperature: "32°C",
  condition: "Cloudy",
  weatherText: "Bengaluru · 32°C · Cloudy",
  temperatureUnit: "celsius",
  preferences: {
    compactMode: false,
    animations: true,
    showGreeting: true,
    analyticsTracking: false,
    crashReports: true,
  },
  updatedAt: new Date().toISOString(),
}

interface UserState {
  user: UserProfile
  isLoading: boolean
  hasLoaded: boolean

  loadUser: () => Promise<void>
  updateUser: (updates: Partial<UserProfile>) => void
  updatePreferences: (prefUpdates: Partial<UserPreferences>) => void
}

export const useUserStore = create<UserState>((set, get) => ({
  user: DEFAULT_USER,
  isLoading: false,
  hasLoaded: false,

    loadUser: async () => {
      set({ isLoading: true })
      try {
        const res = await fetchCollection<UserProfile>("users", [DEFAULT_USER])
        if (res.items && res.items.length > 0) {
          const loadedUser = { ...DEFAULT_USER, ...res.items[0] }
          set({ user: loadedUser, isLoading: false, hasLoaded: true })
        } else {
          set({ isLoading: false, hasLoaded: true })
        }
      } catch {
        set({ isLoading: false, hasLoaded: true })
      }
    },

    updateUser: (updates) => {
      const current = get().user
      const updatedUser: UserProfile = {
        ...current,
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      // 1. Update UI state immediately across entire app
      set({ user: updatedUser })

      // 2. Persist locally immediately
      setLocalCache("users", [updatedUser])

      // 3. Debounce cloud save to Google Drive (700ms)
      scheduleItemUpsert("users", updatedUser, 700)
    },

    updatePreferences: (prefUpdates) => {
      const current = get().user
      const updatedPrefs: UserPreferences = {
        ...current.preferences,
        ...prefUpdates,
      }
      get().updateUser({ preferences: updatedPrefs })
    },
}))

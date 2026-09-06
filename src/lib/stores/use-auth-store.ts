"use client"

import { create } from "zustand"

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
}

interface AuthState {
  isAuthenticated: boolean
  isInitialized: boolean
  user: AuthUser | null
  error: string | null
  initAuth: () => void
  login: (email: string, password: string, remember?: boolean) => Promise<boolean>
  logout: () => void
  clearError: () => void
}

const MASTER_EMAIL = "smsaad05082003@gmail.com"
const MASTER_PASSWORD = "victus"

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isInitialized: false,
  user: null,
  error: null,

  initAuth: () => {
    if (typeof window === "undefined") return

    try {
      // Check localStorage or sessionStorage
      const savedSession =
        localStorage.getItem("personal_os_session") ||
        sessionStorage.getItem("personal_os_session")

      if (savedSession) {
        const parsed = JSON.parse(savedSession)
        if (parsed?.email?.toLowerCase() === MASTER_EMAIL) {
          set({
            isAuthenticated: true,
            isInitialized: true,
            user: {
              id: "user_saad",
              name: parsed.name || "Saad",
              email: MASTER_EMAIL,
              role: "Owner / Master User",
            },
            error: null,
          })
          return
        }
      }
    } catch {
      // Session parsing error
    }

    set({ isAuthenticated: false, isInitialized: true, user: null })
  },

  login: async (email: string, password: string, remember: boolean = true) => {
    const cleanEmail = (email || "").trim().toLowerCase()
    const cleanPassword = (password || "").trim()

    if (!cleanEmail || !cleanPassword) {
      set({ error: "Please provide both email and password." })
      return false
    }

    if (cleanEmail === MASTER_EMAIL && cleanPassword === MASTER_PASSWORD) {
      const userPayload: AuthUser = {
        id: "user_saad",
        name: "Saad",
        email: MASTER_EMAIL,
        role: "Owner / Master User",
      }

      const sessionData = JSON.stringify({
        ...userPayload,
        loginAt: new Date().toISOString(),
        token: `pos_token_${Date.now()}`,
      })

      if (remember) {
        localStorage.setItem("personal_os_session", sessionData)
      } else {
        sessionStorage.setItem("personal_os_session", sessionData)
      }

      // Set cookie for browser session persistence
      document.cookie = `personal_os_auth=1; path=/; max-age=${remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24}; SameSite=Lax`

      set({
        isAuthenticated: true,
        user: userPayload,
        error: null,
      })

      return true
    } else {
      set({ error: "Invalid credentials. Verify your email and password." })
      return false
    }
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("personal_os_session")
      sessionStorage.removeItem("personal_os_session")
      document.cookie = "personal_os_auth=; path=/; max-age=0; SameSite=Lax"
    }

    set({
      isAuthenticated: false,
      user: null,
      error: null,
    })
  },

  clearError: () => set({ error: null }),
}))

"use client"

import { create } from "zustand"
import { fetchCollection, setLocalCache, getLocalCache } from "../drive-api"
import { scheduleItemUpsert, scheduleItemDelete } from "../sync-manager"

export interface Milestone {
  id: string
  title: string
  done: boolean
}

export interface Goal {
  id: string
  title: string
  description: string
  category: string
  targetDate?: string
  milestones: Milestone[]
  color: string
  createdAt?: string
  updatedAt?: string
}

export const INITIAL_GOALS: Goal[] = [
  {
    id: "goal-1",
    title: "Hit 50K YouTube Subscribers",
    description: "Grow the channel to 50,000 subscribers by end of 2026 with consistent, high-quality content.",
    category: "Career",
    targetDate: "2026-12-31",
    color: "bg-violet-500",
    milestones: [
      { id: "m1", title: "Reach 10K subscribers", done: true },
      { id: "m2", title: "Post 20 tutorial videos", done: true },
      { id: "m3", title: "Launch channel trailer", done: true },
      { id: "m4", title: "Reach 25K subscribers", done: false },
      { id: "m5", title: "Collaborate with 3 creators", done: false },
      { id: "m6", title: "Launch YouTube membership", done: false },
      { id: "m7", title: "Reach 50K subscribers", done: false },
    ],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "goal-2",
    title: "Build $10K/mo Client Pipeline",
    description: "Scale high-ticket video editing & consulting clients to consistent monthly revenue.",
    category: "Finance",
    targetDate: "2026-11-30",
    color: "bg-emerald-500",
    milestones: [
      { id: "m8", title: "Build case-study landing page", done: true },
      { id: "m9", title: "Sign 2 retainer clients", done: true },
      { id: "m10", title: "Reach $5K/mo milestone", done: true },
      { id: "m11", title: "Sign 3rd high-ticket client", done: false },
      { id: "m12", title: "Hit $10K monthly target", done: false },
    ],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "goal-3",
    title: "Complete Marathon Training",
    description: "Build stamina and run full 42km marathon under 4 hours.",
    category: "Health",
    targetDate: "2026-10-25",
    color: "bg-rose-500",
    milestones: [
      { id: "m13", title: "Run 10km consistently", done: true },
      { id: "m14", title: "Half marathon test run", done: true },
      { id: "m15", title: "30km long run", done: false },
      { id: "m16", title: "Official race day", done: false },
    ],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
]

interface GoalState {
  goals: Goal[]
  isLoading: boolean
  hasLoaded: boolean

  loadGoals: () => Promise<void>
  addGoal: (goal: Omit<Goal, "id" | "createdAt" | "updatedAt">) => void
  updateGoal: (id: string, updates: Partial<Goal>) => void
  deleteGoal: (id: string) => void
  toggleMilestone: (goalId: string, milestoneId: string) => void
  addMilestone: (goalId: string, title: string) => void
  deleteMilestone: (goalId: string, milestoneId: string) => void
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: INITIAL_GOALS,
  isLoading: false,
  hasLoaded: false,

    loadGoals: async () => {
      set({ isLoading: true })
      try {
        const res = await fetchCollection<Goal>("goals", INITIAL_GOALS)
        set({ goals: res.items, isLoading: false, hasLoaded: true })
      } catch {
        set({ isLoading: false, hasLoaded: true })
      }
    },

    addGoal: (data) => {
      const now = new Date().toISOString()
      const newGoal: Goal = {
        ...data,
        id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      }

      const updated = [newGoal, ...get().goals]
      set({ goals: updated })
      setLocalCache("goals", updated)
      scheduleItemUpsert("goals", newGoal, 700)
    },

    updateGoal: (id, updates) => {
      const current = get().goals
      const goal = current.find(g => g.id === id)
      if (!goal) return

      const updatedGoal: Goal = {
        ...goal,
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      const updated = current.map(g => g.id === id ? updatedGoal : g)
      set({ goals: updated })
      setLocalCache("goals", updated)
      scheduleItemUpsert("goals", updatedGoal, 700)
    },

    deleteGoal: (id) => {
      const updated = get().goals.filter(g => g.id !== id)
      set({ goals: updated })
      setLocalCache("goals", updated)
      scheduleItemDelete("goals", id)
    },

    toggleMilestone: (goalId, milestoneId) => {
      const goal = get().goals.find(g => g.id === goalId)
      if (!goal) return

      const updatedMilestones = goal.milestones.map(m =>
        m.id === milestoneId ? { ...m, done: !m.done } : m
      )
      get().updateGoal(goalId, { milestones: updatedMilestones })
    },

    addMilestone: (goalId, title) => {
      const goal = get().goals.find(g => g.id === goalId)
      if (!goal) return

      const newM: Milestone = {
        id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title,
        done: false,
      }
      get().updateGoal(goalId, { milestones: [...goal.milestones, newM] })
    },

    deleteMilestone: (goalId, milestoneId) => {
      const goal = get().goals.find(g => g.id === goalId)
      if (!goal) return

      const updatedMilestones = goal.milestones.filter(m => m.id !== milestoneId)
      get().updateGoal(goalId, { milestones: updatedMilestones })
    },
}))

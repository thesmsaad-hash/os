export interface CollectionEnvelope<T = unknown> {
  version: number
  collection: string
  updatedAt: string
  items: T[]
  metadata?: Record<string, unknown>
}

// ── Task & Project ─────────────────────────────────────────────────────────────
export type Priority = "Low" | "Medium" | "High" | "Urgent"
export type TaskStatus = "Inbox" | "Todo" | "In Progress" | "Waiting" | "Done" | "Cancelled"

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  description?: string
  priority: Priority
  status: TaskStatus
  dueDate?: string
  tags?: string[]
  subtasks?: Subtask[]
  projectId?: string
  createdAt?: string
  updatedAt?: string
}

export interface Project {
  id: string
  name: string
  description?: string
  color?: string
  status: "active" | "completed" | "on_hold"
  createdAt?: string
  updatedAt?: string
}

// ── Calendar Event ─────────────────────────────────────────────────────────────
export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: string
  end: string
  time?: string
  startDate?: string
  allDay?: boolean
  category?: "work" | "personal" | "meeting" | "health" | "other"
  color?: string
  createdAt?: string
  updatedAt?: string
}

// ── Note & Knowledge ──────────────────────────────────────────────────────────
export interface Note {
  id: string
  title: string
  content: string
  folder?: string
  tags: string[]
  pinned?: boolean
  createdAt?: string
  updatedAt?: string
}

// ── Habit Tracker ─────────────────────────────────────────────────────────────
export interface Habit {
  id: string
  name: string
  icon?: string
  frequency: "daily" | "weekly"
  targetDays?: number
  streak: number
  bestStreak: number
  completedDates: string[] // YYYY-MM-DD
  completedToday?: boolean
  createdAt?: string
  updatedAt?: string
}

// ── Focus Session ─────────────────────────────────────────────────────────────
export interface FocusSession {
  id: string
  phase: "focus" | "short-break" | "long-break"
  mode: string
  durationMinutes: number
  timestamp: string
  taskId?: string
}

// ── Finance ───────────────────────────────────────────────────────────────────
export interface FinanceTransaction {
  id: string
  description: string
  amount: number
  type: "income" | "expense"
  category: string
  date: string
  account?: string
  createdAt?: string
  updatedAt?: string
}

// ── Bookmark ──────────────────────────────────────────────────────────────────
export interface Bookmark {
  id: string
  title: string
  url: string
  category: string
  tags: string[]
  favicon?: string
  createdAt?: string
}

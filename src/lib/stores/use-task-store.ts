"use client"

import { create } from "zustand"
import type { Task, Project } from "../types/drive"
import { fetchCollection, setLocalCache } from "../drive-api"
import { useSyncStore } from "./use-sync-store"
import { sendNtfyNotification } from "../ntfy"
import { scheduleAutoSave, scheduleItemUpsert, scheduleItemDelete } from "../sync-manager"

const INITIAL_TASKS: Task[] = [
  { id: "1", title: "Review client video draft", priority: "High", status: "In Progress", tags: ["client", "video"], dueDate: "2026-09-06" },
  { id: "2", title: "Write project proposal", priority: "Medium", status: "Todo", tags: ["writing"], dueDate: "2026-09-07" },
  { id: "3", title: "Update portfolio website", priority: "Low", status: "Todo", tags: ["design"], dueDate: "2026-09-08" },
  { id: "4", title: "Team sync call", priority: "High", status: "Todo", tags: ["meeting"], dueDate: "2026-09-06" },
  { id: "5", title: "Prepare invoice", priority: "Medium", status: "Todo", tags: ["finance"], dueDate: "2026-09-07" },
  { id: "6", title: "Ship v2 release", priority: "Urgent", status: "In Progress", tags: ["dev"], dueDate: "2026-09-06" },
]

const INITIAL_PROJECTS: Project[] = [
  { id: "p1", name: "Personal OS", description: "All-in-one productivity OS", color: "#8b5cf6", status: "active" },
  { id: "p2", name: "Client Work", description: "Freelance client deliverables", color: "#3b82f6", status: "active" },
  { id: "p3", name: "Content Creation", description: "YouTube & tech articles", color: "#ec4899", status: "active" },
]

interface TaskState {
  tasks: Task[]
  projects: Project[]
  isLoading: boolean
  hasLoaded: boolean

  loadTasks: () => Promise<void>
  createTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => Promise<Task>
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => Promise<Task>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleTask: (id: string) => Promise<void>
  createProject: (project: Omit<Project, "id">) => Promise<void>
  deleteProject: (id: string) => Promise<void>
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: INITIAL_TASKS,
  projects: INITIAL_PROJECTS,
  isLoading: false,
  hasLoaded: false,

  loadTasks: async () => {
    set({ isLoading: true })
    const sync = useSyncStore.getState()
    sync.startSync()

    try {
      const [tasksRes, projectsRes] = await Promise.all([
        fetchCollection<Task>("tasks", INITIAL_TASKS),
        fetchCollection<Project>("projects", INITIAL_PROJECTS),
      ])

      set({
        tasks: tasksRes.items,
        projects: projectsRes.items,
        isLoading: false,
        hasLoaded: true,
      })
      sync.finishSync()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Load failed"
      sync.failSync(msg)
      set({ isLoading: false, hasLoaded: true })
    }
  },

  createTask: async (taskInput) => {
    const newTask: Task = {
      ...taskInput,
      id: "task_" + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // 1. Update UI immediately
    const nextTasks = [newTask, ...get().tasks]
    set({ tasks: nextTasks })

    // 2. Persist locally immediately
    setLocalCache("tasks", nextTasks)

    // 3. Queue cloud synchronization (700ms debounce)
    scheduleAutoSave("tasks", nextTasks, 700)

    // If Urgent or High, trigger ntfy push notification
    if (newTask.priority === "Urgent" || newTask.priority === "High") {
      sendNtfyNotification({
        title: `🚨 ${newTask.priority} Task Added`,
        message: newTask.title + (newTask.dueDate ? ` (Due: ${newTask.dueDate})` : ""),
        priority: newTask.priority === "Urgent" ? 5 : 4,
        tags: ["warning", "calendar"],
        eventType: "taskReminders",
      }).catch(() => {})
    }

    return newTask
  },

  addTask: async (task) => {
    return get().createTask(task)
  },

  updateTask: async (id, updates) => {
    let updatedTask: Task | undefined
    const nextTasks = get().tasks.map(t => {
      if (t.id === id) {
        updatedTask = { ...t, ...updates, updatedAt: new Date().toISOString() }
        return updatedTask
      }
      return t
    })

    // 1. Update UI immediately
    set({ tasks: nextTasks })

    // 2. Persist locally immediately
    setLocalCache("tasks", nextTasks)

    // 3. Schedule debounced cloud save
    if (updatedTask) {
      scheduleItemUpsert("tasks", updatedTask, 700)
    } else {
      scheduleAutoSave("tasks", nextTasks, 700)
    }
  },

  deleteTask: async (id) => {
    // 1. Update UI immediately
    const nextTasks = get().tasks.filter(t => t.id !== id)
    set({ tasks: nextTasks })

    // 2. Persist locally immediately
    setLocalCache("tasks", nextTasks)

    // 3. Schedule cloud deletion
    scheduleItemDelete("tasks", id)
  },

  toggleTask: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    const isDone = task.status === "Done"
    const nextStatus = isDone ? "Todo" : "Done"
    await get().updateTask(id, { status: nextStatus })
  },

  createProject: async (projectInput) => {
    const newProject: Project = {
      ...projectInput,
      id: "proj_" + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    }
    const nextProjects = [...get().projects, newProject]
    set({ projects: nextProjects })
    setLocalCache("projects", nextProjects)
    scheduleAutoSave("projects", nextProjects, 700)
  },

  deleteProject: async (id) => {
    const nextProjects = get().projects.filter(p => p.id !== id)
    set({ projects: nextProjects })
    setLocalCache("projects", nextProjects)
    scheduleAutoSave("projects", nextProjects, 700)
  },
}))

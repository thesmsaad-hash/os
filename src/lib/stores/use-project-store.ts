"use client"

import { create } from "zustand"
import { fetchCollection, setLocalCache, getLocalCache } from "../drive-api"
import { scheduleAutoSave, scheduleItemUpsert, scheduleItemDelete } from "../sync-manager"

export type ProjectStatus = "Planning" | "Active" | "Paused" | "Completed" | "Archived"

export interface ProjectTask {
  id: string
  title: string
  status: "Todo" | "In Progress" | "Done"
  priority: "Low" | "Medium" | "High"
}

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  color: string
  tasks: ProjectTask[]
  dueDate?: string
  createdAt?: string
  updatedAt?: string
}

export const INITIAL_PROJECTS: Project[] = [
  {
    id: "proj-1",
    name: "Client Video — ABC Corp",
    description: "Brand refresh video package for ABC Corp. Includes 3 videos.",
    status: "Active",
    color: "bg-violet-500",
    dueDate: "2026-09-20",
    tasks: [
      { id: "t1", title: "Write script", status: "Done", priority: "High" },
      { id: "t2", title: "Record footage", status: "In Progress", priority: "High" },
      { id: "t3", title: "Edit main cut", status: "Todo", priority: "High" },
      { id: "t4", title: "Color grading", status: "Todo", priority: "Medium" },
      { id: "t5", title: "Sound design", status: "Todo", priority: "Medium" },
      { id: "t6", title: "Client review", status: "Todo", priority: "Low" },
      { id: "t7", title: "Final export", status: "Todo", priority: "Low" },
    ],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "proj-2",
    name: "Portfolio Website Redesign",
    description: "Personal portfolio redesign with modern case studies and Personal OS docs.",
    status: "Active",
    color: "bg-blue-500",
    dueDate: "2026-09-30",
    tasks: [
      { id: "t8", title: "Wireframes", status: "Done", priority: "High" },
      { id: "t9", title: "Develop homepage", status: "Done", priority: "High" },
      { id: "t10", title: "Add case studies", status: "In Progress", priority: "Medium" },
      { id: "t11", title: "SEO optimization", status: "Todo", priority: "Low" },
    ],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "proj-3",
    name: "YouTube Tech Series",
    description: "10-episode series on Advanced Web Apps, Next.js, and Cloud architectures.",
    status: "Planning",
    color: "bg-amber-500",
    dueDate: "2026-10-15",
    tasks: [
      { id: "t12", title: "Topic brainstorm", status: "Done", priority: "Medium" },
      { id: "t13", title: "Outline first 3 episodes", status: "Todo", priority: "High" },
      { id: "t14", title: "Design thumbnails template", status: "Todo", priority: "Medium" },
    ],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
]

interface ProjectState {
  projects: Project[]
  isLoading: boolean
  hasLoaded: boolean

  loadProjects: () => Promise<void>
  addProject: (project: Omit<Project, "id" | "createdAt" | "updatedAt">) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  addTaskToProject: (projectId: string, task: Omit<ProjectTask, "id">) => void
  updateProjectTask: (projectId: string, taskId: string, updates: Partial<ProjectTask>) => void
  deleteProjectTask: (projectId: string, taskId: string) => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: INITIAL_PROJECTS,
  isLoading: false,
  hasLoaded: false,

    loadProjects: async () => {
      set({ isLoading: true })
      try {
        const res = await fetchCollection<Project>("projects", INITIAL_PROJECTS)
        set({ projects: res.items, isLoading: false, hasLoaded: true })
      } catch {
        set({ isLoading: false, hasLoaded: true })
      }
    },

    addProject: (data) => {
      const now = new Date().toISOString()
      const newProject: Project = {
        ...data,
        id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      }

      const updated = [newProject, ...get().projects]
      set({ projects: updated })
      setLocalCache("projects", updated)
      scheduleItemUpsert("projects", newProject, 700)
    },

    updateProject: (id, updates) => {
      const current = get().projects
      const project = current.find(p => p.id === id)
      if (!project) return

      const updatedProject: Project = {
        ...project,
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      const updated = current.map(p => p.id === id ? updatedProject : p)
      set({ projects: updated })
      setLocalCache("projects", updated)
      scheduleItemUpsert("projects", updatedProject, 700)
    },

    deleteProject: (id) => {
      const updated = get().projects.filter(p => p.id !== id)
      set({ projects: updated })
      setLocalCache("projects", updated)
      scheduleItemDelete("projects", id)
    },

    addTaskToProject: (projectId, taskData) => {
      const project = get().projects.find(p => p.id === projectId)
      if (!project) return

      const newTask: ProjectTask = {
        ...taskData,
        id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      }

      const updatedTasks = [...project.tasks, newTask]
      get().updateProject(projectId, { tasks: updatedTasks })
    },

    updateProjectTask: (projectId, taskId, updates) => {
      const project = get().projects.find(p => p.id === projectId)
      if (!project) return

      const updatedTasks = project.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
      get().updateProject(projectId, { tasks: updatedTasks })
    },

    deleteProjectTask: (projectId, taskId) => {
      const project = get().projects.find(p => p.id === projectId)
      if (!project) return

      const updatedTasks = project.tasks.filter(t => t.id !== taskId)
      get().updateProject(projectId, { tasks: updatedTasks })
    },
}))

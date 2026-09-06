"use client"

import { useEffect, useState } from "react"
import {
  Plus, Search, MoreHorizontal, CheckSquare, Calendar,
  Users, BarChart2, Kanban, FileText, Clock, ChevronRight,
  FolderOpen, Circle, ArrowUpRight, X, Briefcase
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { useProjectStore, type Project, type ProjectTask, type ProjectStatus } from "@/lib/stores/use-project-store"

// ── mock data ─────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<ProjectStatus, string> = {
  Planning:  "bg-amber-500/20 text-amber-400",
  Active:    "bg-emerald-500/20 text-emerald-400",
  Paused:    "bg-slate-500/20 text-slate-400",
  Completed: "bg-blue-500/20 text-blue-400",
  Archived:  "bg-muted text-muted-foreground",
}

const PROJECT_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500",
  "bg-amber-500",  "bg-rose-500", "bg-cyan-500",
]


function uid() {
  return Math.random().toString(36).substring(2, 9)
}

function getProgress(tasks: ProjectTask[]) {
  if (!tasks.length) return 0
  return Math.round((tasks.filter(t => t.status === "Done").length / tasks.length) * 100)
}

// ── AddProject modal ───────────────────────────────────────────────────────────
function AddProjectModal({ onClose, onAdd }: { onClose: () => void; onAdd: (p: Omit<Project, "id" | "createdAt" | "updatedAt">) => void }) {
  const [name, setName]           = useState("")
  const [desc, setDesc]           = useState("")
  const [color, setColor]         = useState(PROJECT_COLORS[0])
  const [status, setStatus]       = useState<ProjectStatus>("Planning")
  const [dueDate, setDueDate]     = useState("")

  const handleAdd = () => {
    if (!name.trim()) return
    onAdd({ name: name.trim(), description: desc, status, color, tasks: [], dueDate: dueDate || undefined })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">New Project</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-col gap-3">
          <Input placeholder="Project name..." value={name} onChange={e => setName(e.target.value)} autoFocus />
          <textarea
            className="w-full text-sm border rounded-md px-3 py-2 bg-background resize-none"
            placeholder="Description..."
            rows={3}
            value={desc}
            onChange={e => setDesc(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as ProjectStatus)} className="w-full text-sm border rounded-md px-3 py-1.5 bg-background">
                {(["Planning","Active","Paused","Completed","Archived"] as ProjectStatus[]).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full text-sm border rounded-md px-3 py-1.5 bg-background" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Color</label>
            <div className="flex gap-2">
              {PROJECT_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} className={`h-7 w-7 rounded-full ${c} ring-2 ring-offset-2 ring-offset-card transition-all ${color === c ? "ring-white" : "ring-transparent"}`} />
              ))}
            </div>
          </div>
          <Button onClick={handleAdd} className="w-full mt-1" disabled={!name.trim()}>Create Project</Button>
        </div>
      </div>
    </div>
  )
}

// ── ProjectDetail ─────────────────────────────────────────────────────────────
function ProjectDetail({ project, onClose, onUpdate }: {
  project: Project
  onClose: () => void
  onUpdate: (id: string, tasks: ProjectTask[]) => void
}) {
  const [newTask, setNewTask]   = useState("")
  const [view, setView]         = useState<"list" | "kanban">("list")
  const progress                = getProgress(project.tasks)
  const cols: ProjectTask["status"][] = ["Todo", "In Progress", "Done"]

  const addTask = () => {
    if (!newTask.trim()) return
    const task: ProjectTask = { id: uid(), title: newTask.trim(), status: "Todo", priority: "Medium" }
    onUpdate(project.id, [...project.tasks, task])
    setNewTask("")
  }

  const toggleTask = (taskId: string) => {
    const updated = project.tasks.map(t =>
      t.id === taskId ? { ...t, status: t.status === "Done" ? "Todo" : "Done" as ProjectTask["status"] } : t
    )
    onUpdate(project.id, updated)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* header */}
        <div className="p-6 border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${project.color} flex items-center justify-center`}>
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg">{project.name}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{project.description}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[project.status]}`}>{project.status}</span>
            {project.dueDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Due {format(new Date(project.dueDate + "T00:00"), "MMM d, yyyy")}
              </span>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              {project.tasks.filter(t => t.status === "Done").length}/{project.tasks.length} tasks
            </span>
          </div>

          {/* progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Progress</span>
              <span className="text-xs font-medium">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full ${project.color} transition-all duration-500`} style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* view toggle */}
        <div className="flex items-center gap-2 px-6 py-3 border-b">
          <div className="flex border rounded-lg overflow-hidden">
            {(["list","kanban"] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1 text-xs font-medium capitalize transition-colors ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* tasks */}
        <div className="flex-1 overflow-auto p-6">
          {view === "list" ? (
            <div className="flex flex-col gap-1">
              {project.tasks.map(task => (
                <div key={task.id} onClick={() => toggleTask(task.id)} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/40 cursor-pointer group">
                  <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${task.status === "Done" ? "bg-primary border-primary" : "border-muted-foreground/40 group-hover:border-primary/60"}`}>
                    {task.status === "Done" && <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span className={`flex-1 text-sm ${task.status === "Done" ? "line-through text-muted-foreground" : ""}`}>{task.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    task.priority === "High" ? "bg-red-500/15 text-red-400" : task.priority === "Medium" ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"
                  }`}>{task.priority}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto">
              {cols.map(col => (
                <div key={col} className="min-w-48 w-48 shrink-0">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{col} · {project.tasks.filter(t => t.status === col).length}</p>
                  <div className="flex flex-col gap-2">
                    {project.tasks.filter(t => t.status === col).map(task => (
                      <div key={task.id} className="bg-background border rounded-lg p-2.5 text-xs cursor-pointer hover:border-primary/40">
                        <p className="font-medium">{task.title}</p>
                        <p className={`mt-1 ${task.priority === "High" ? "text-red-400" : task.priority === "Medium" ? "text-amber-400" : "text-emerald-400"}`}>{task.priority}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* add task */}
        <div className="px-6 pb-6 pt-2 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Add task..."
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTask()}
              className="text-sm"
            />
            <Button onClick={addTask} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ProjectCard ───────────────────────────────────────────────────────────────
function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const progress = getProgress(project.tasks)
  const done     = project.tasks.filter(t => t.status === "Done").length
  return (
    <div
      onClick={onClick}
      className="bg-card border rounded-xl p-5 cursor-pointer hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5 group"
    >
      <div className="flex items-start justify-between">
        <div className={`h-10 w-10 rounded-xl ${project.color} flex items-center justify-center mb-4`}>
          <Briefcase className="h-5 w-5 text-white" />
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[project.status]}`}>
          {project.status}
        </span>
      </div>

      <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">{project.name}</h3>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{project.description}</p>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">{done}/{project.tasks.length} tasks</span>
          <span className="text-xs font-medium">{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full ${project.color} transition-all`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {project.dueDate
          ? <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(project.dueDate + "T00:00"), "MMM d")}</span>
          : <span />}
        <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-primary font-medium">
          Open <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const { projects, addProject, updateProject, loadProjects, hasLoaded } = useProjectStore()
  const [search, setSearch]       = useState("")
  const [filter, setFilter]       = useState<ProjectStatus | "All">("All")
  const [showAdd, setShowAdd]     = useState(false)
  const [detailId, setDetailId]   = useState<string | null>(null)

  useEffect(() => {
    if (!hasLoaded) loadProjects()
  }, [hasLoaded, loadProjects])

  const filtered = projects.filter(p => {
    if (filter !== "All" && p.status !== filter) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const detailProject = projects.find(p => p.id === detailId)

  const updateTasks = (id: string, tasks: ProjectTask[]) => {
    updateProject(id, { tasks })
  }

  const FILTERS: (ProjectStatus | "All")[] = ["All", "Active", "Planning", "Paused", "Completed"]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {showAdd && <AddProjectModal onClose={() => setShowAdd(false)} onAdd={addProject} />}
      {detailProject && <ProjectDetail project={detailProject} onClose={() => setDetailId(null)} onUpdate={updateTasks} />}

      {/* header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b">
        <h1 className="text-xl font-semibold">Projects</h1>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 bg-muted/50 border-none text-sm" />
        </div>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5"><Plus className="h-4 w-4" /> New Project</Button>
      </div>

      {/* filter tabs */}
      <div className="flex items-center gap-1 px-6 py-3 border-b overflow-x-auto">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap ${
              filter === f ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {f} {f !== "All" ? `(${projects.filter(p => p.status === f).length})` : `(${projects.length})`}
          </button>
        ))}
      </div>

      {/* grid */}
      <div className="flex-1 overflow-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground">No projects found</p>
            <Button variant="ghost" size="sm" className="mt-2 gap-1.5" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Create one</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(p => (
              <ProjectCard key={p.id} project={p} onClick={() => setDetailId(p.id)} />
            ))}
            <button
              onClick={() => setShowAdd(true)}
              className="border border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted/20 transition-all min-h-44"
            >
              <Plus className="h-8 w-8 opacity-40" />
              <span className="text-sm">New Project</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

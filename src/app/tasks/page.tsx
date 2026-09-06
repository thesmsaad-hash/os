"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Plus, Search, Filter, MoreHorizontal, CheckSquare,
  Calendar, Tag, AlarmClock, ChevronDown, X,
  Inbox, Clock, AlertTriangle, ListChecks, Kanban,
  Cloud, RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { useTaskStore } from "@/lib/stores/use-task-store"
import { useSyncStore } from "@/lib/stores/use-sync-store"
import type { Task, Priority, TaskStatus as Status } from "@/lib/types/drive"

// ── mock data ─────────────────────────────────────────────────────────────────
const initialTasks: Task[] = [
  { id: "1", title: "Review client video draft",    priority: "High",   status: "In Progress", tags: ["client", "video"],  dueDate: "2026-09-05" },
  { id: "2", title: "Write project proposal",       priority: "Medium", status: "Todo",        tags: ["writing"],          dueDate: "2026-09-06" },
  { id: "3", title: "Update portfolio website",     priority: "Low",    status: "Todo",        tags: ["design"],           dueDate: "2026-09-08" },
  { id: "4", title: "Team sync call",               priority: "High",   status: "Todo",        tags: ["meeting"],          dueDate: "2026-09-05" },
  { id: "5", title: "Prepare invoice",              priority: "Medium", status: "Todo",        tags: ["finance"],          dueDate: "2026-09-07" },
  { id: "6", title: "Research competitors",         priority: "Low",    status: "Inbox",       tags: ["research"] },
  { id: "7", title: "Record intro video",           priority: "High",   status: "Inbox",       tags: ["video", "youtube"] },
  { id: "8", title: "Update LinkedIn profile",      priority: "Low",    status: "Waiting",     tags: ["marketing"] },
  { id: "9", title: "Ship v2 release",              priority: "Urgent", status: "In Progress", tags: ["dev"],              dueDate: "2026-09-05" },
  { id: "10", title: "Old task from last week",     priority: "Medium", status: "Inbox",       tags: ["misc"],             dueDate: "2026-09-01" },
]

const PRIORITY_COLORS: Record<Priority, string> = {
  Low:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  High:   "bg-red-500/15 text-red-400 border-red-500/30",
  Urgent: "bg-red-600/20 text-red-500 border-red-600/40",
}

const STATUS_COLORS: Record<Status, string> = {
  "Inbox":       "bg-muted text-muted-foreground",
  "Todo":        "bg-blue-500/15 text-blue-400",
  "In Progress": "bg-violet-500/15 text-violet-400",
  "Waiting":     "bg-amber-500/15 text-amber-400",
  "Done":        "bg-emerald-500/15 text-emerald-400",
  "Cancelled":   "bg-muted text-muted-foreground line-through",
}

const VIEWS = [
  { id: "inbox",    label: "Inbox",     icon: Inbox },
  { id: "today",    label: "Today",     icon: Clock },
  { id: "upcoming", label: "Upcoming",  icon: Calendar },
  { id: "overdue",  label: "Overdue",   icon: AlertTriangle },
  { id: "all",      label: "All Tasks", icon: ListChecks },
  { id: "kanban",   label: "Kanban",    icon: Kanban },
]

const STATUSES: Status[]   = ["Inbox", "Todo", "In Progress", "Waiting", "Done", "Cancelled"]
const PRIORITIES: Priority[] = ["Low", "Medium", "High", "Urgent"]

// ── helpers ───────────────────────────────────────────────────────────────────
function isToday(dateStr?: string) {
  if (!dateStr) return false
  return dateStr === format(new Date(), "yyyy-MM-dd")
}
function isOverdue(dateStr?: string) {
  if (!dateStr) return false
  return dateStr < format(new Date(), "yyyy-MM-dd")
}
function isUpcoming(dateStr?: string) {
  if (!dateStr) return false
  return dateStr > format(new Date(), "yyyy-MM-dd")
}

// ── AddTask modal ─────────────────────────────────────────────────────────────
function AddTaskModal({ onClose, onAdd }: { onClose: () => void; onAdd: (t: Task) => void }) {
  const [title, setTitle]       = useState("")
  const [priority, setPriority] = useState<Priority>("Medium")
  const [status, setStatus]     = useState<Status>("Todo")
  const [dueDate, setDueDate]   = useState("")

  const handleAdd = () => {
    if (!title.trim()) return
    onAdd({ id: Date.now().toString(), title: title.trim(), priority, status, dueDate: dueDate || undefined, tags: [] })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border rounded-xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">New Task</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-col gap-3">
          <Input
            placeholder="Task title..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            autoFocus
            className="text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="w-full text-sm border rounded-md px-3 py-1.5 bg-background"
              >
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Status)}
                className="w-full text-sm border rounded-md px-3 py-1.5 bg-background"
              >
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full text-sm border rounded-md px-3 py-1.5 bg-background"
            />
          </div>
          <Button onClick={handleAdd} className="w-full mt-1" disabled={!title.trim()}>
            Add Task
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── TaskRow ───────────────────────────────────────────────────────────────────
function TaskRow({ task, onToggle }: { task: Task; onToggle: (id: string) => void }) {
  const done = task.status === "Done"
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/40 transition-colors group">
      <button
        onClick={() => onToggle(task.id)}
        className={`h-5 w-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
          done ? "bg-primary border-primary" : "border-muted-foreground/40 hover:border-primary/60"
        }`}
      >
        {done && <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>}
      </button>

      <span className={`flex-1 text-sm ${done ? "line-through text-muted-foreground" : ""}`}>
        {task.title}
      </span>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {(task.tags ?? []).slice(0, 2).map(tag => (
          <span key={tag} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
            {tag}
          </span>
        ))}
        {task.dueDate && (
          <span className={`text-xs flex items-center gap-1 ${
            isOverdue(task.dueDate) && !done ? "text-red-400" : "text-muted-foreground"
          }`}>
            <Calendar className="h-3 w-3" />
            {isToday(task.dueDate) ? "Today" : format(new Date(task.dueDate + "T00:00"), "MMM d")}
          </span>
        )}
      </div>

      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_COLORS[task.priority]}`}>
        {task.priority}
      </span>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status]}`}>
        {task.status}
      </span>
    </div>
  )
}

// ── KanbanView ────────────────────────────────────────────────────────────────
function KanbanView({ tasks, onToggle }: { tasks: Task[]; onToggle: (id: string) => void }) {
  const cols: Status[] = ["Todo", "In Progress", "Waiting", "Done"]
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {cols.map(col => {
        const colTasks = tasks.filter(t => t.status === col)
        return (
          <div key={col} className="min-w-64 w-64 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[col]}`}>{col}</span>
              <span className="text-xs text-muted-foreground">{colTasks.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {colTasks.map(task => (
                <div key={task.id} className="bg-card border rounded-lg p-3 hover:border-primary/40 transition-colors cursor-pointer">
                  <p className={`text-sm font-medium ${task.status === "Done" ? "line-through text-muted-foreground" : ""}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${PRIORITY_COLORS[task.priority]}`}>
                      {task.priority}
                    </span>
                    {task.dueDate && (
                      <span className={`text-xs flex items-center gap-1 ${isOverdue(task.dueDate) && task.status !== "Done" ? "text-red-400" : "text-muted-foreground"}`}>
                        <Calendar className="h-3 w-3" />
                        {isToday(task.dueDate) ? "Today" : format(new Date(task.dueDate + "T00:00"), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const { tasks, loadTasks, createTask, toggleTask, hasLoaded } = useTaskStore()
  const sync = useSyncStore()

  const [view, setView]           = useState("today")
  const [search, setSearch]       = useState("")
  const [showAdd, setShowAdd]     = useState(false)

  useEffect(() => {
    if (!hasLoaded) {
      loadTasks()
    }
  }, [hasLoaded, loadTasks])

  const handleAddTask = useCallback(async (task: Task) => {
    await createTask({
      title: task.title,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      tags: task.tags,
    })
  }, [createTask])

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase()
    if (search && !t.title.toLowerCase().includes(q)) return false
    if (view === "inbox")    return t.status === "Inbox"
    if (view === "today")    return isToday(t.dueDate) && t.status !== "Done" && t.status !== "Cancelled"
    if (view === "upcoming") return isUpcoming(t.dueDate) && t.status !== "Done"
    if (view === "overdue")  return isOverdue(t.dueDate) && t.status !== "Done" && t.status !== "Cancelled"
    if (view === "kanban")   return true
    return true // all
  })

  const todayCount   = tasks.filter(t => isToday(t.dueDate) && t.status !== "Done" && t.status !== "Cancelled").length
  const overdueCount = tasks.filter(t => isOverdue(t.dueDate) && t.status !== "Done" && t.status !== "Cancelled").length

  return (
    <div className="h-full flex overflow-hidden">
      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} onAdd={handleAddTask} />}

      {/* ── Left view nav ── */}
      <div className="w-48 shrink-0 border-r bg-background/50 flex flex-col py-4 px-3 gap-1">
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left ${
              view === v.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <v.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{v.label}</span>
            {v.id === "today"  && todayCount   > 0 && <span className="text-xs bg-primary/20 text-primary px-1.5 rounded-full">{todayCount}</span>}
            {v.id === "overdue" && overdueCount > 0 && <span className="text-xs bg-red-500/20 text-red-400 px-1.5 rounded-full">{overdueCount}</span>}
          </button>
        ))}

        {/* Google Drive sync badge */}
        <div className="mt-auto pt-3 border-t border-border/40">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/30 text-[11px] text-muted-foreground">
            <Cloud className="h-3.5 w-3.5 text-primary" />
            <span className="truncate">
              {sync.status === "syncing" ? "Syncing Drive..." : sync.status === "synced" ? "Drive Synced" : "Local Cache"}
            </span>
            {sync.status === "syncing" && <RefreshCw className="h-3 w-3 animate-spin ml-auto text-primary" />}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          <h1 className="text-xl font-semibold capitalize min-w-24">{
            VIEWS.find(v => v.id === view)?.label ?? "Tasks"
          }</h1>
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-8 bg-muted/50 border-none text-sm"
            />
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Task
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {view === "kanban" ? (
            <KanbanView tasks={filtered} onToggle={toggleTask} />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <CheckSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No tasks here.</p>
              <Button variant="ghost" size="sm" className="mt-2 gap-1.5" onClick={() => setShowAdd(true)}>
                <Plus className="h-4 w-4" /> Add one
              </Button>
            </div>
          ) : (
            <div className="max-w-3xl flex flex-col gap-0.5">
              {filtered.map(task => (
                <TaskRow key={task.id} task={task} onToggle={toggleTask} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

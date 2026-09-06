"use client"

import { useEffect, useState } from "react"
import {
  Plus, Target, ChevronRight, X, Check, Edit3,
  Calendar, TrendingUp, Flag, Circle, CheckCircle2,
  ArrowRight, Flame, Trophy
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { useGoalStore, type Goal, type Milestone } from "@/lib/stores/use-goal-store"

function uid() {
  return Math.random().toString(36).substring(2, 9)
}

function getProgress(milestones: Milestone[]) {
  if (!milestones.length) return 0
  return Math.round((milestones.filter(m => m.done).length / milestones.length) * 100)
}

const CATEGORIES  = ["Health", "Career", "Finance", "Learning", "Personal", "Fitness", "Creative"]
const GOAL_COLORS = ["bg-violet-500","bg-blue-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-cyan-500"]

const CAT_COLORS: Record<string, string> = {
  Health:   "bg-emerald-500/15 text-emerald-400",
  Career:   "bg-blue-500/15 text-blue-400",
  Finance:  "bg-amber-500/15 text-amber-400",
  Learning: "bg-violet-500/15 text-violet-400",
  Personal: "bg-rose-500/15 text-rose-400",
  Fitness:  "bg-cyan-500/15 text-cyan-400",
  Creative: "bg-orange-500/15 text-orange-400",
}

// ── AddGoal modal ─────────────────────────────────────────────────────────────
function AddGoalModal({ onClose, onAdd }: { onClose: () => void; onAdd: (g: Omit<Goal, "id" | "createdAt" | "updatedAt">) => void }) {
  const [title, setTitle]   = useState("")
  const [desc, setDesc]     = useState("")
  const [cat, setCat]       = useState("Career")
  const [date, setDate]     = useState("")
  const [color, setColor]   = useState(GOAL_COLORS[0])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">New Goal</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-col gap-3">
          <Input placeholder="Goal title..." value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          <textarea className="w-full text-sm border rounded-md px-3 py-2 bg-background resize-none" placeholder="Description..." rows={3} value={desc} onChange={e => setDesc(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Category</label>
              <select value={cat} onChange={e => setCat(e.target.value)} className="w-full text-sm border rounded-md px-3 py-1.5 bg-background">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Target Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full text-sm border rounded-md px-3 py-1.5 bg-background" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Color</label>
            <div className="flex gap-2">
              {GOAL_COLORS.map(c => <button key={c} onClick={() => setColor(c)} className={`h-7 w-7 rounded-full ${c} ring-2 ring-offset-2 ring-offset-card ${color === c ? "ring-white" : "ring-transparent"}`} />)}
            </div>
          </div>
          <Button onClick={() => { if (!title.trim()) return; onAdd({ title, description: desc, category: cat, targetDate: date || undefined, color, milestones: [] }); onClose() }} disabled={!title.trim()} className="w-full mt-1">
            Create Goal
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── GoalDetail ────────────────────────────────────────────────────────────────
function GoalDetail({ goal, onClose, onUpdate }: {
  goal: Goal; onClose: () => void; onUpdate: (id: string, milestones: Milestone[]) => void
}) {
  const [newMs, setNewMs]   = useState("")
  const progress            = getProgress(goal.milestones)

  const addMilestone = () => {
    if (!newMs.trim()) return
    onUpdate(goal.id, [...goal.milestones, { id: uid(), title: newMs.trim(), done: false }])
    setNewMs("")
  }

  const toggleMs = (msId: string) => {
    onUpdate(goal.id, goal.milestones.map(m => m.id === msId ? { ...m, done: !m.done } : m))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* header */}
        <div className="p-6 border-b">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${goal.color} flex items-center justify-center`}>
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg">{goal.title}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full ${CAT_COLORS[goal.category] ?? "bg-muted text-muted-foreground"}`}>{goal.category}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
          {goal.description && <p className="text-sm text-muted-foreground mb-3">{goal.description}</p>}
          {goal.targetDate && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
              <Calendar className="h-3 w-3" /> Target: {format(new Date(goal.targetDate + "T00:00"), "MMMM d, yyyy")}
            </p>
          )}
          {/* progress */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Progress</span>
              <span className="text-sm font-bold">{progress}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full ${goal.color} transition-all duration-500`} style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* milestones */}
        <div className="flex-1 overflow-auto p-6">
          <h3 className="text-sm font-semibold mb-3">Milestones <span className="text-muted-foreground font-normal">({goal.milestones.filter(m => m.done).length}/{goal.milestones.length})</span></h3>
          <div className="flex flex-col gap-1.5">
            {goal.milestones.map((ms, i) => (
              <div key={ms.id} onClick={() => toggleMs(ms.id)} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/40 cursor-pointer group">
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${ms.done ? `${goal.color} border-transparent` : "border-muted-foreground/40 group-hover:border-primary/60"}`}>
                  {ms.done && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="text-xs text-muted-foreground mr-1 w-4">{i + 1}.</span>
                <span className={`flex-1 text-sm ${ms.done ? "line-through text-muted-foreground" : ""}`}>{ms.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* add milestone */}
        <div className="px-6 pb-6 pt-2 border-t">
          <div className="flex gap-2">
            <Input placeholder="Add milestone..." value={newMs} onChange={e => setNewMs(e.target.value)} onKeyDown={e => e.key === "Enter" && addMilestone()} className="text-sm" />
            <Button size="sm" onClick={addMilestone} className="gap-1.5"><Plus className="h-4 w-4" /> Add</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── GoalCard ──────────────────────────────────────────────────────────────────
function GoalCard({ goal, onClick }: { goal: Goal; onClick: () => void }) {
  const progress = getProgress(goal.milestones)
  const done     = goal.milestones.filter(m => m.done).length
  const isComplete = progress === 100

  return (
    <div
      onClick={onClick}
      className={`bg-card border rounded-xl p-5 cursor-pointer hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5 group ${isComplete ? "border-emerald-500/30" : ""}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`h-11 w-11 rounded-xl ${goal.color} flex items-center justify-center`}>
          {isComplete ? <Trophy className="h-5 w-5 text-white" /> : <Target className="h-5 w-5 text-white" />}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_COLORS[goal.category] ?? "bg-muted text-muted-foreground"}`}>
          {goal.category}
        </span>
      </div>

      <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors leading-snug">{goal.title}</h3>
      {goal.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{goal.description}</p>}

      {/* progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">{done}/{goal.milestones.length} milestones</span>
          <span className="text-xs font-bold">{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isComplete ? "bg-emerald-500" : goal.color}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* recent milestones */}
      <div className="space-y-1">
        {goal.milestones.slice(0, 3).map(ms => (
          <div key={ms.id} className="flex items-center gap-2 text-xs">
            {ms.done
              ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              : <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
            <span className={ms.done ? "line-through text-muted-foreground" : "text-muted-foreground"}>{ms.title}</span>
          </div>
        ))}
        {goal.milestones.length > 3 && (
          <p className="text-xs text-muted-foreground pl-5">+{goal.milestones.length - 3} more</p>
        )}
      </div>

      {goal.targetDate && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3 pt-3 border-t">
          <Flag className="h-3 w-3" />
          {format(new Date(goal.targetDate + "T00:00"), "MMM d, yyyy")}
          <span className="ml-auto text-primary opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity text-xs font-medium">
            Open <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      )}
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function GoalsPage() {
  const { goals, addGoal, updateGoal, deleteGoal, loadGoals, hasLoaded } = useGoalStore()
  const [showAdd, setShowAdd] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [catFilter, setCatFilter] = useState("All")

  useEffect(() => {
    if (!hasLoaded) loadGoals()
  }, [hasLoaded, loadGoals])

  const filtered = catFilter === "All" ? goals : goals.filter(g => g.category === catFilter)
  const detailGoal = goals.find(g => g.id === detailId)
  const allCats    = ["All", ...Array.from(new Set(goals.map(g => g.category)))]

  const updateMilestones = (id: string, milestones: Milestone[]) => {
    updateGoal(id, { milestones })
  }

  const overallProgress = goals.length
    ? Math.round(goals.reduce((a, g) => a + getProgress(g.milestones), 0) / goals.length)
    : 0

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {showAdd && <AddGoalModal onClose={() => setShowAdd(false)} onAdd={addGoal} />}
      {detailGoal && <GoalDetail goal={detailGoal} onClose={() => setDetailId(null)} onUpdate={updateMilestones} />}

      {/* header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b">
        <h1 className="text-xl font-semibold">Goals</h1>
        <div className="flex gap-1">
          {allCats.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${catFilter === c ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >{c}</button>
          ))}
        </div>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5"><Plus className="h-4 w-4" /> New Goal</Button>
      </div>

      {/* summary */}
      <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b bg-muted/10">
        <div className="text-center">
          <p className="text-2xl font-bold">{goals.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Goals</p>
        </div>
        <div className="text-center border-x">
          <p className="text-2xl font-bold text-emerald-400">{goals.filter(g => getProgress(g.milestones) === 100).length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Completed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{overallProgress}%</p>
          <p className="text-xs text-muted-foreground mt-0.5">Overall Progress</p>
        </div>
      </div>

      {/* goal grid */}
      <div className="flex-1 overflow-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Target className="h-12 w-12 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground">No goals yet</p>
            <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Create your first goal</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(g => <GoalCard key={g.id} goal={g} onClick={() => setDetailId(g.id)} />)}
            <button onClick={() => setShowAdd(true)} className="border border-dashed rounded-xl flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted/20 transition-all min-h-48">
              <Plus className="h-8 w-8 opacity-40" />
              <span className="text-sm">New Goal</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Plus, Flame, X, Check, MoreHorizontal, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, subDays, startOfWeek, endOfWeek, eachDayOfInterval as edi, isToday
} from "date-fns"

// ── types ─────────────────────────────────────────────────────────────────────
interface Habit {
  id:        string
  name:      string
  icon:      string
  category:  string
  frequency: "Daily" | "Weekly"
  target:    number
  color:     string
  logs:      string[]   // ISO date strings where habit was completed
}

function uid() { return Math.random().toString(36).slice(2) }
function todayStr() { return format(new Date(), "yyyy-MM-dd") }
function dateStr(d: Date) { return format(d, "yyyy-MM-dd") }

function pseudoRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

const BASE_DATE = new Date("2026-09-06T12:00:00Z")

// Build stable past log entries for demo
function buildLogs(daysBack: number, hitRate = 0.75, habitSeed = 1) {
  const logs: string[] = []
  for (let i = 0; i < daysBack; i++) {
    if (pseudoRandom(i * 13 + habitSeed * 37) < hitRate) {
      logs.push(dateStr(subDays(BASE_DATE, i)))
    }
  }
  return logs
}

const HABIT_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500",
  "bg-amber-500",  "bg-rose-500", "bg-cyan-500",
]
const ICONS = ["🏋️","📚","💧","⏰","🧘","🎯","✍️","🥗","🏃","😴","🎸","💻"]
const CATEGORIES = ["Health", "Learning", "Work", "Mindfulness", "Fitness", "Other"]

const initialHabits: Habit[] = [
  { id:"1", name:"Exercise",      icon:"🏋️", category:"Fitness",      frequency:"Daily",  target:1, color:"bg-violet-500", logs: buildLogs(30, 0.80, 1) },
  { id:"2", name:"Read",          icon:"📚", category:"Learning",     frequency:"Daily",  target:1, color:"bg-blue-500",   logs: buildLogs(30, 0.70, 2) },
  { id:"3", name:"Drink Water",   icon:"💧", category:"Health",       frequency:"Daily",  target:8, color:"bg-cyan-500",   logs: buildLogs(30, 0.60, 3) },
  { id:"4", name:"Wake Up Early", icon:"⏰", category:"Health",       frequency:"Daily",  target:1, color:"bg-amber-500",  logs: buildLogs(30, 0.65, 4) },
  { id:"5", name:"Meditation",    icon:"🧘", category:"Mindfulness",  frequency:"Daily",  target:1, color:"bg-emerald-500",logs: buildLogs(30, 0.55, 5) },
]

// ── helpers ──────────────────────────────────────────────────────────────────
function getStreak(logs: string[]) {
  let streak = 0
  const today = new Date()
  for (let i = 0; i <= 365; i++) {
    const d = dateStr(subDays(today, i))
    if (logs.includes(d)) streak++
    else break
  }
  return streak
}

function getBestStreak(logs: string[]) {
  if (!logs.length) return 0
  const sorted = [...logs].sort()
  let best = 1, cur = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const diff = (curr.getTime() - prev.getTime()) / 86400000
    if (diff === 1) { cur++; best = Math.max(best, cur) }
    else cur = 1
  }
  return best
}

function getCompletionRate(logs: string[], days = 30) {
  let count = 0
  for (let i = 0; i < days; i++) {
    if (logs.includes(dateStr(subDays(new Date(), i)))) count++
  }
  return Math.round((count / days) * 100)
}

// ── HeatMap ────────────────────────────────────────────────────────────────────
function HeatMap({ logs, color }: { logs: string[]; color: string }) {
  const today = new Date()
  const days  = eachDayOfInterval({ start: subDays(today, 89), end: today })
  const weeks: Date[][] = []
  let week: Date[] = []
  days.forEach((d, i) => {
    week.push(d)
    if (week.length === 7 || i === days.length - 1) { weeks.push(week); week = [] }
  })

  return (
    <div className="flex gap-1 mt-3 overflow-x-auto pb-1">
      {weeks.map((wk, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {wk.map(d => {
            const done = logs.includes(dateStr(d))
            return (
              <div
                key={d.toISOString()}
                title={format(d, "MMM d") + (done ? " ✓" : "")}
                className={`h-3.5 w-3.5 rounded-sm transition-colors ${
                  done ? `${color} opacity-90` : "bg-muted opacity-50"
                } ${isToday(d) ? "ring-1 ring-white/40" : ""}`}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── WeekRow (top area) ────────────────────────────────────────────────────────
function WeekRow({ habit, onToggle }: { habit: Habit; onToggle: (id: string, date: string) => void }) {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 })
  const end   = endOfWeek(new Date(),   { weekStartsOn: 1 })
  const days  = eachDayOfInterval({ start, end })
  const today = new Date()
  const streak = getStreak(habit.logs)

  return (
    <div className="bg-card border rounded-xl p-5 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl ${habit.color} flex items-center justify-center text-xl`}>
            {habit.icon}
          </div>
          <div>
            <p className="font-semibold text-sm">{habit.name}</p>
            <p className="text-xs text-muted-foreground">{habit.category} · {habit.frequency}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-amber-400 text-sm font-bold">
          <Flame className="h-4 w-4" />
          {streak}
        </div>
      </div>

      {/* week checkboxes */}
      <div className="flex gap-1.5">
        {days.map(d => {
          const ds   = dateStr(d)
          const done = habit.logs.includes(ds)
          const past = d <= today
          return (
            <button
              key={ds}
              onClick={() => past && onToggle(habit.id, ds)}
              title={format(d, "EEE MMM d")}
              className={`flex-1 flex flex-col items-center gap-1.5 py-2 rounded-lg transition-all ${
                past ? "cursor-pointer" : "cursor-default opacity-30"
              } ${done ? `${habit.color} text-white` : "bg-muted/50 hover:bg-muted"}`}
            >
              <span className="text-[10px] font-medium">{format(d, "EEE")[0]}</span>
              <div className={`h-4 w-4 rounded-full flex items-center justify-center ${done ? "bg-white/20" : "bg-muted/80"}`}>
                {done && <Check className="h-2.5 w-2.5" />}
              </div>
              <span className={`text-[10px] ${isToday(d) ? "font-bold" : "font-medium opacity-70"}`}>{format(d, "d")}</span>
            </button>
          )
        })}
      </div>

      {/* mini stats */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs text-muted-foreground">
        <span>Best: <b className="text-foreground">{getBestStreak(habit.logs)}d</b></span>
        <span>30-day rate: <b className="text-foreground">{getCompletionRate(habit.logs)}%</b></span>
        <span>Total: <b className="text-foreground">{habit.logs.length}d</b></span>
      </div>
    </div>
  )
}

// ── AddHabit modal ────────────────────────────────────────────────────────────
function AddHabitModal({ onClose, onAdd }: { onClose: () => void; onAdd: (h: Habit) => void }) {
  const [name, setName]     = useState("")
  const [icon, setIcon]     = useState("🎯")
  const [cat, setCat]       = useState("Health")
  const [color, setColor]   = useState(HABIT_COLORS[0])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border rounded-xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">New Habit</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-col gap-3">
          <Input placeholder="Habit name..." value={name} onChange={e => setName(e.target.value)} autoFocus />
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(ic => (
                <button key={ic} onClick={() => setIcon(ic)} className={`h-9 w-9 text-lg rounded-lg transition-colors ${icon === ic ? "bg-primary/20 ring-2 ring-primary" : "bg-muted hover:bg-muted/80"}`}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Category</label>
            <select value={cat} onChange={e => setCat(e.target.value)} className="w-full text-sm border rounded-md px-3 py-1.5 bg-background">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Color</label>
            <div className="flex gap-2">
              {HABIT_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} className={`h-7 w-7 rounded-full ${c} ring-2 ring-offset-2 ring-offset-card transition-all ${color === c ? "ring-white" : "ring-transparent"}`} />
              ))}
            </div>
          </div>
          <Button onClick={() => { if (!name.trim()) return; onAdd({ id: uid(), name: name.trim(), icon, category: cat, frequency: "Daily", target: 1, color, logs: [] }); onClose() }} className="w-full mt-1" disabled={!name.trim()}>
            Add Habit
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function HabitsPage() {
  const [habits, setHabits]   = useState<Habit[]>(initialHabits)
  const [showAdd, setShowAdd] = useState(false)
  const [view, setView]       = useState<"week" | "heatmap">("week")

  const today = todayStr()

  const toggleHabit = (id: string, date: string) => {
    setHabits(hs => hs.map(h => {
      if (h.id !== id) return h
      const logs = h.logs.includes(date) ? h.logs.filter(l => l !== date) : [...h.logs, date]
      return { ...h, logs }
    }))
  }

  const addHabit = (h: Habit) => setHabits(hs => [...hs, h])

  const totalToday    = habits.length
  const doneToday     = habits.filter(h => h.logs.includes(today)).length
  const overallStreak = Math.max(...habits.map(h => getStreak(h.logs)), 0)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {showAdd && <AddHabitModal onClose={() => setShowAdd(false)} onAdd={addHabit} />}

      {/* header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b">
        <h1 className="text-xl font-semibold">Habits</h1>
        <div className="flex border rounded-lg overflow-hidden">
          {(["week","heatmap"] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{v}</button>
          ))}
        </div>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5"><Plus className="h-4 w-4" /> New Habit</Button>
      </div>

      {/* summary bar */}
      <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b bg-muted/10">
        <div className="text-center">
          <p className="text-2xl font-bold">{doneToday}<span className="text-muted-foreground text-base font-normal">/{totalToday}</span></p>
          <p className="text-xs text-muted-foreground mt-0.5">Done today</p>
        </div>
        <div className="text-center border-x">
          <p className="text-2xl font-bold text-amber-400 flex items-center justify-center gap-1"><Flame className="h-5 w-5" />{overallStreak}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Best streak</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{Math.round(doneToday / Math.max(totalToday, 1) * 100)}%</p>
          <p className="text-xs text-muted-foreground mt-0.5">Today's rate</p>
        </div>
      </div>

      {/* habit list */}
      <div className="flex-1 overflow-auto p-6">
        {view === "week" ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-5xl">
            {habits.map(h => <WeekRow key={h.id} habit={h} onToggle={toggleHabit} />)}
          </div>
        ) : (
          <div className="flex flex-col gap-6 max-w-3xl">
            {habits.map(h => (
              <div key={h.id} className="bg-card border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xl">{h.icon}</span>
                  <div>
                    <p className="font-semibold text-sm">{h.name}</p>
                    <p className="text-xs text-muted-foreground">{getCompletionRate(h.logs)}% completion rate · {getStreak(h.logs)}d streak</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1 text-amber-400 font-bold text-sm">
                    <Flame className="h-4 w-4" />{getStreak(h.logs)}
                  </div>
                </div>
                <HeatMap logs={h.logs} color={h.color} />
                <p className="text-[10px] text-muted-foreground mt-2 text-right">Last 90 days</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

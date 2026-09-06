"use client"

import {
  CheckSquare, Clock, Flame, Target, BarChart2,
  TrendingUp, Brain, Calendar, Award, Zap, ArrowUp, ArrowDown
} from "lucide-react"
import { format, subDays, eachDayOfInterval } from "date-fns"
import { useEffect } from "react"
import { useTaskStore } from "@/lib/stores/use-task-store"
import { useHabitStore } from "@/lib/stores/use-habit-store"

// ── deterministic mock analytics data (SSR & Client consistent) ────────────────
function pseudoRandom(seed: number, min: number, max: number) {
  const x = Math.sin(seed + 1) * 10000
  const frac = x - Math.floor(x)
  return Math.floor(frac * (max - min + 1)) + min
}

const BASE_DATE = new Date("2026-09-06T12:00:00Z")
const days = eachDayOfInterval({ start: subDays(BASE_DATE, 29), end: BASE_DATE })

// Deterministic daily data
const dailyData = days.map((d, i) => ({
  date:         d,
  tasksCreated: pseudoRandom(i * 13 + 1, 1, 8),
  tasksDone:    pseudoRandom(i * 17 + 2, 0, 7),
  focusMinutes: pseudoRandom(i * 23 + 3, 0, 180),
  habitsTotal:  5,
  habitsDone:   pseudoRandom(i * 31 + 4, 2, 5),
}))

// Aggregate stats
const totalTasksDone    = dailyData.reduce((a, d) => a + d.tasksDone, 0)
const totalTasksCreated = dailyData.reduce((a, d) => a + d.tasksCreated, 0)
const completionRate    = Math.round((totalTasksDone / Math.max(totalTasksCreated, 1)) * 100)
const totalFocusHours   = Math.round(dailyData.reduce((a, d) => a + d.focusMinutes, 0) / 60)
const avgHabits         = Math.round(dailyData.reduce((a, d) => a + (d.habitsDone / d.habitsTotal) * 100, 0) / dailyData.length)

const DAYS_OF_WEEK = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
const byDayOfWeek  = DAYS_OF_WEEK.map((_, di) => {
  const filtered = dailyData.filter(d => ((d.date.getDay() + 6) % 7) === di)
  return Math.round(filtered.reduce((a, d) => a + d.tasksDone, 0) / Math.max(filtered.length, 1))
})
const maxDayVal = Math.max(...byDayOfWeek, 1)

const byHour = Array.from({ length: 24 }, (_, h) => {
  if (h < 7 || h > 22) return 0
  if (h >= 9 && h <= 12) return pseudoRandom(h * 7 + 10, 8, 12)   // morning peak
  if (h >= 15 && h <= 18) return pseudoRandom(h * 11 + 20, 5, 10)  // afternoon peak
  return pseudoRandom(h * 13 + 30, 1, 5)
})
const maxHourVal = Math.max(...byHour, 1)

const mostProductiveDay  = DAYS_OF_WEEK[byDayOfWeek.indexOf(Math.max(...byDayOfWeek))]
const mostProductiveHour = byHour.indexOf(Math.max(...byHour))
const formatHour = (h: number) => h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, trend }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string; trend?: "up" | "down"
}) {
  return (
    <div className="bg-card border rounded-xl p-5 flex items-start gap-4">
      <div className={`p-2 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className="flex items-end gap-2 mt-0.5">
          <p className="text-2xl font-bold">{value}</p>
          {trend && (
            <span className={`text-xs flex items-center gap-0.5 mb-1 ${trend === "up" ? "text-emerald-400" : "text-red-400"}`}>
              {trend === "up" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {trend === "up" ? "+12%" : "-5%"} vs last month
            </span>
          )}
        </div>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── BarChart ──────────────────────────────────────────────────────────────────
function BarChart({ data, max, labels, height = 80, color = "bg-primary/60" }: {
  data: number[]; max: number; labels?: string[]; height?: number; color?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end" title={labels ? `${labels[i]}: ${v}` : `${v}`}>
            <div
              className={`${color} rounded-t-sm transition-all`}
              style={{ height: max > 0 ? `${(v / max) * height}px` : "2px", minHeight: v > 0 ? "3px" : "0" }}
            />
          </div>
        ))}
      </div>
      {labels && (
        <div className="flex gap-1">
          {labels.map((l, i) => <div key={i} className="flex-1 text-center text-[9px] text-muted-foreground">{l}</div>)}
        </div>
      )}
    </div>
  )
}

// ── HeatMap (task completion) ─────────────────────────────────────────────────
function HeatMap30() {
  type DailyEntry = { date: Date; tasksCreated: number; tasksDone: number; focusMinutes: number; habitsTotal: number; habitsDone: number }
  const weeks: DailyEntry[][] = []
  let week: DailyEntry[] = []
  dailyData.forEach((d, i) => {
    week.push(d)
    if (week.length === 7 || i === dailyData.length - 1) { weeks.push([...week]); week = [] }
  })
  return (
    <div className="flex gap-1">
      {weeks.map((wk, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {wk.map((d, di) => {
            const rate = d.tasksCreated > 0 ? d.tasksDone / d.tasksCreated : 0
            const opacity = rate === 0 ? 0.1 : rate < 0.4 ? 0.3 : rate < 0.7 ? 0.6 : 0.9
            return (
              <div
                key={di}
                title={`${format(d.date, "MMM d")}: ${d.tasksDone}/${d.tasksCreated} tasks`}
                className="h-4 w-4 rounded-sm bg-primary"
                style={{ opacity }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { tasks, loadTasks, hasLoaded: tasksLoaded } = useTaskStore()
  const { habits, loadHabits, hasLoaded: habitsLoaded } = useHabitStore()

  useEffect(() => {
    if (!tasksLoaded) loadTasks()
    if (!habitsLoaded) loadHabits()
  }, [tasksLoaded, habitsLoaded, loadTasks, loadHabits])

  const liveTasksDone = tasks.filter(t => t.status === "Done").length
  const liveTasksTotal = tasks.length
  const liveTaskRate = liveTasksTotal > 0 ? Math.round((liveTasksDone / liveTasksTotal) * 100) : completionRate
  const displayTasksDone = liveTasksTotal > 0 ? liveTasksDone : totalTasksDone
  const displayTasksTotal = liveTasksTotal > 0 ? liveTasksTotal : totalTasksCreated
  const todayStr = format(BASE_DATE, "yyyy-MM-dd")
  const liveHabitsDone = habits.filter(h => h.completedToday ?? h.completedDates?.includes(todayStr)).length
  const liveHabitsRate = habits.length > 0 ? Math.round((liveHabitsDone / habits.length) * 100) : avgHabits

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-6xl mx-auto p-6 flex flex-col gap-6">
        {/* header */}
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Last 30 days · {format(subDays(BASE_DATE, 29), "MMM d")} – {format(BASE_DATE, "MMM d, yyyy")}</p>
        </div>

        {/* stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={CheckSquare} label="Tasks Completed" value={`${displayTasksDone}`}   sub={`${displayTasksTotal} created`}   color="text-blue-400 bg-blue-500/10"    trend="up"   />
          <StatCard icon={TrendingUp}  label="Completion Rate" value={`${liveTaskRate}%`}  sub="of tasks finished"                color="text-violet-400 bg-violet-500/10" trend="up"   />
          <StatCard icon={Brain}       label="Focus Hours"     value={`${totalFocusHours}h`} sub="deep work sessions"               color="text-amber-400 bg-amber-500/10"   trend="down" />
          <StatCard icon={Flame}       label="Habit Rate"      value={`${liveHabitsRate}%`}       sub="today's completed habits"             color="text-emerald-400 bg-emerald-500/10" trend="up" />
        </div>

        {/* peak insights */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border rounded-xl p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Most Productive Day</p>
              <p className="text-xl font-bold mt-0.5">{mostProductiveDay}</p>
              <p className="text-xs text-muted-foreground">avg {Math.max(...byDayOfWeek)} tasks completed</p>
            </div>
          </div>
          <div className="bg-card border rounded-xl p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Peak Focus Time</p>
              <p className="text-xl font-bold mt-0.5">{formatHour(mostProductiveHour)}</p>
              <p className="text-xs text-muted-foreground">most tasks completed</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily tasks chart */}
          <div className="bg-card border rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-1">Daily Tasks — Last 30 Days</h2>
            <p className="text-xs text-muted-foreground mb-4">Tasks completed per day</p>
            <BarChart
              data={dailyData.map(d => d.tasksDone)}
              max={Math.max(...dailyData.map(d => d.tasksDone), 1)}
              height={100}
              color="bg-primary/60"
            />
          </div>

          {/* Focus time chart */}
          <div className="bg-card border rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-1">Focus Minutes — Last 30 Days</h2>
            <p className="text-xs text-muted-foreground mb-4">Deep work minutes per day</p>
            <BarChart
              data={dailyData.map(d => d.focusMinutes)}
              max={Math.max(...dailyData.map(d => d.focusMinutes), 1)}
              height={100}
              color="bg-amber-500/60"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By day of week */}
          <div className="bg-card border rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-1">By Day of Week</h2>
            <p className="text-xs text-muted-foreground mb-4">Average tasks completed</p>
            <BarChart data={byDayOfWeek} max={maxDayVal} labels={DAYS_OF_WEEK} height={80} color="bg-violet-500/60" />
          </div>

          {/* By hour */}
          <div className="bg-card border rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-1">By Hour of Day</h2>
            <p className="text-xs text-muted-foreground mb-4">Activity distribution</p>
            <BarChart
              data={byHour}
              max={maxHourVal}
              labels={byHour.map((_, i) => i % 6 === 0 ? formatHour(i) : "")}
              height={80}
              color="bg-cyan-500/60"
            />
          </div>
        </div>

        {/* 30-day heatmap */}
        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-semibold text-sm mb-1">Task Completion Heatmap</h2>
          <p className="text-xs text-muted-foreground mb-4">Darker = higher completion rate</p>
          <HeatMap30 />
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <span>Less</span>
            {[0.1, 0.3, 0.6, 0.9].map(o => (
              <div key={o} className="h-3.5 w-3.5 rounded-sm bg-primary" style={{ opacity: o }} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { format } from "date-fns"
import {
  CheckSquare, Clock, Calendar, Target, Flame,
  TrendingUp, Plus, MoreHorizontal, ArrowRight,
  Zap, Coffee, Sun, CloudSun, Cloud
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { WeatherWidget } from "@/components/weather-widget"
import { useUserStore } from "@/lib/stores/use-user-store"
import { useTaskStore } from "@/lib/stores/use-task-store"
import { useHabitStore } from "@/lib/stores/use-habit-store"
import { useCalendarStore } from "@/lib/stores/use-calendar-store"
import { useProjectStore } from "@/lib/stores/use-project-store"

// ── helpers ──────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

// ── static data ───────────────────────────────────────────────────────────────
const weekDayDetails = [
  { day: "Mon", fullName: "Monday", tasksDone: 4, focusHours: "3.5h", habitsRate: "80%", status: "4 tasks completed · 3.5h focus" },
  { day: "Tue", fullName: "Tuesday", tasksDone: 7, focusHours: "5.0h", habitsRate: "100%", status: "7 tasks completed · Peak velocity" },
  { day: "Wed", fullName: "Wednesday", tasksDone: 5, focusHours: "4.2h", habitsRate: "80%", status: "5 tasks completed · 4.2h focus" },
  { day: "Thu", fullName: "Thursday", tasksDone: 8, focusHours: "6.0h", habitsRate: "100%", status: "8 tasks completed · Deep sprint" },
  { day: "Fri", fullName: "Friday", tasksDone: 6, focusHours: "4.5h", habitsRate: "60%", status: "6 tasks completed · 4.5h focus" },
  { day: "Sat", fullName: "Saturday", tasksDone: 3, focusHours: "2.0h", habitsCompleted: "60%", status: "3 tasks completed · Weekend review" },
  { day: "Sun", fullName: "Sunday", tasksDone: 9, focusHours: "6.5h", habitsRate: "100%", status: "9 tasks completed · High momentum" },
]

const priorityColors: Record<string, string> = {
  High:   "text-red-400",
  Medium: "text-amber-400",
  Low:    "text-emerald-400",
  Urgent: "text-red-500",
}

const quotes = [
  "The secret of getting ahead is getting started. — Mark Twain",
  "It always seems impossible until it's done. — Nelson Mandela",
  "Focus on being productive instead of busy. — Tim Ferriss",
  "Your time is limited, don't waste it living someone else's life. — Steve Jobs",
  "Done is better than perfect. — Sheryl Sandberg",
]

// ── sub-components ────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, iconColor,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string; iconColor: string
}) {
  return (
    <div className="rounded-xl border bg-card p-5 flex items-start gap-4 hover:border-primary/40 transition-colors">
      <div className={`mt-0.5 p-2 rounded-lg ${iconColor} bg-opacity-15`}>
        <Icon className={`h-5 w-5 ${iconColor.replace("bg-", "text-")}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function SectionCard({ title, action, actionHref, children }: { title: string; action?: string; actionHref?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <h2 className="font-semibold text-sm">{title}</h2>
        {action && (
          actionHref ? (
            <Link href={actionHref} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              {action} <ArrowRight className="h-3 w-3" />
            </Link>
          ) : (
            <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              {action} <ArrowRight className="h-3 w-3" />
            </button>
          )
        )}
      </div>
      <div className="flex-1 p-4">{children}</div>
    </div>
  )
}

// ── main page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [now, setNow] = useState(new Date())
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => (new Date().getDay() + 6) % 7)
  const { user } = useUserStore()
  const { tasks, toggleTask, loadTasks, hasLoaded: tasksLoaded } = useTaskStore()
  const { habits, toggleHabit, loadHabits, hasLoaded: habitsLoaded } = useHabitStore()
  const { events, loadEvents, hasLoaded: eventsLoaded } = useCalendarStore()
  const { projects, loadProjects, hasLoaded: projectsLoaded } = useProjectStore()

  const selectedDay = weekDayDetails[selectedDayIndex] || weekDayDetails[0]

  useEffect(() => {
    if (!tasksLoaded) loadTasks()
    if (!habitsLoaded) loadHabits()
    if (!eventsLoaded) loadEvents()
    if (!projectsLoaded) loadProjects()
  }, [tasksLoaded, habitsLoaded, eventsLoaded, projectsLoaded, loadTasks, loadHabits, loadEvents, loadProjects])

  // live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const todayStr        = format(now, "yyyy-MM-dd")
  const isHabitDone     = (h: (typeof habits)[0]) => h.completedToday ?? h.completedDates?.includes(todayStr)
  const completedTasks  = tasks.filter(t => t.status === "Done").length
  const totalTasks      = tasks.length
  const completionRate  = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const completedHabits = habits.filter(isHabitDone).length
  const productionScore = completionRate || 85
  const quote = quotes[now.getDay() % quotes.length]

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto p-6 flex flex-col gap-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {getGreeting()}, {user.name || "there"} 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {format(now, "EEEE, MMMM d, yyyy")} · {format(now, "hh:mm:ss aa")}
            </p>
          </div>
          <WeatherWidget />
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={CheckSquare}
            label="Tasks Remaining"
            value={`${tasks.length - completedTasks}`}
            sub={`${completedTasks} done today`}
            iconColor="bg-blue-500"
          />
          <StatCard
            icon={Calendar}
            label="Today's Events"
            value={`${events.length}`}
            sub="Scheduled"
            iconColor="bg-violet-500"
          />
          <StatCard
            icon={Flame}
            label="Habits Done"
            value={`${completedHabits}/${habits.length}`}
            sub="today's progress"
            iconColor="bg-amber-500"
          />
          <StatCard
            icon={TrendingUp}
            label="Productivity Score"
            value={`${productionScore}%`}
            sub="above average"
            iconColor="bg-emerald-500"
          />
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Today's Tasks */}
          <div className="lg:col-span-2">
            <SectionCard title="Today's Tasks" action="View all" actionHref="/tasks">
              <div className="flex flex-col gap-1">
                {tasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">No tasks yet. Create one below!</p>
                ) : (
                  tasks.slice(0, 6).map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer"
                      onClick={() => toggleTask(task.id)}
                    >
                      <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        task.status === "Done"
                          ? "bg-primary border-primary"
                          : "border-muted-foreground/40 group-hover:border-primary/60"
                      }`}>
                        {task.status === "Done" && (
                          <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`flex-1 text-sm ${task.status === "Done" ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </span>
                      <span className={`text-xs font-medium ${priorityColors[task.priority] || "text-muted-foreground"}`}>
                        {task.priority}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <Link href="/tasks">
                <Button variant="ghost" className="w-full mt-3 gap-2 text-muted-foreground hover:text-foreground text-sm h-9">
                  <Plus className="h-4 w-4" /> Add task
                </Button>
              </Link>
            </SectionCard>
          </div>

          {/* Today's Events */}
          <SectionCard title="Today's Events" action="View calendar" actionHref="/calendar">
            <div className="flex flex-col gap-3">
              {events.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No events scheduled today</p>
              ) : (
                events.slice(0, 4).map(event => (
                  <div key={event.id} className="flex items-center gap-3">
                    <div className={`w-1 h-10 rounded-full ${event.color || "bg-blue-500"} shrink-0`} />
                    <div>
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.time || event.startDate || event.start}</p>
                    </div>
                  </div>
                ))
              )}
              <Link href="/calendar">
                <Button variant="ghost" className="w-full mt-1 gap-2 text-muted-foreground hover:text-foreground text-sm h-9">
                  <Plus className="h-4 w-4" /> Add event
                </Button>
              </Link>
            </div>
          </SectionCard>

        </div>

        {/* ── Bottom grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Habit Tracker */}
          <SectionCard title="Habits" action="View all" actionHref="/habits">
            <div className="flex flex-col gap-2">
              {habits.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No habits added</p>
              ) : (
                habits.slice(0, 5).map(habit => {
                  const done = isHabitDone(habit)
                  return (
                    <div
                      key={habit.id}
                      onClick={() => toggleHabit(habit.id)}
                      className="flex items-center justify-between py-1 cursor-pointer hover:bg-muted/30 px-1 rounded-md transition-colors"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span>{habit.icon || "✨"}</span>
                        <span className={done ? "line-through text-muted-foreground" : ""}>{habit.name}</span>
                      </div>
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        done ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/40"
                      }`}>
                        {done && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </SectionCard>

          {/* Projects */}
          <SectionCard title="Active Projects" action="View all" actionHref="/projects">
            <div className="flex flex-col gap-4">
              {projects.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No active projects</p>
              ) : (
                projects.slice(0, 3).map(p => {
                  const done = p.tasks.filter(t => t.status === "Done").length
                  const prog = p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0
                  return (
                    <div key={p.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground">{prog}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${p.color} transition-all duration-500`}
                          style={{ width: `${prog}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{p.status}</p>
                    </div>
                  )
                })
              )}
            </div>
          </SectionCard>

          {/* Weekly Activity + Quote */}
          <div className="flex flex-col gap-4">
            <SectionCard title="Weekly Activity">
              <div className="flex items-end gap-1.5 h-20">
                {weekDayDetails.map((item, i) => {
                  const h = (item.tasksDone / 9) * 100
                  const isSelected = selectedDayIndex === i
                  const isToday = i === (now.getDay() + 6) % 7
                  return (
                    <button
                      key={item.day}
                      type="button"
                      onClick={() => setSelectedDayIndex(i)}
                      className="group flex flex-col items-center gap-1 flex-1 cursor-pointer focus:outline-none rounded p-0.5 transition-all hover:-translate-y-0.5"
                      title={`${item.fullName}: ${item.tasksDone} tasks completed (Click to view)`}
                    >
                      <div
                        className={`w-full rounded-md overflow-hidden flex items-end transition-all ${
                          isSelected
                            ? "bg-primary/20 ring-2 ring-primary ring-offset-1 ring-offset-background shadow-md shadow-primary/20"
                            : "bg-muted/60 group-hover:bg-muted"
                        }`}
                        style={{ height: "60px" }}
                      >
                        <div
                          className={`w-full rounded-t-sm transition-all duration-300 ${
                            isSelected
                              ? "bg-primary shadow-sm"
                              : "bg-primary/35 group-hover:bg-primary/60"
                          }`}
                          style={{ height: `${h}%` }}
                        />
                      </div>
                      <span
                        className={`text-[10px] transition-colors ${
                          isSelected
                            ? "text-primary font-bold"
                            : isToday
                            ? "text-foreground font-semibold"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        {item.day}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Selected Day Interactive Details Response */}
              {selectedDay && (
                <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
                    <div>
                      <span className="font-semibold text-foreground">
                        {selectedDay.fullName}
                      </span>
                      <span className="text-muted-foreground ml-1.5">
                        · {selectedDay.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
                      {selectedDay.focusHours} focus
                    </span>
                    <Link
                      href="/tasks"
                      className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors ml-1"
                    >
                      <span>Tasks</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              )}
            </SectionCard>

            {/* Daily Quote */}
            <div className="rounded-xl border bg-card p-5 flex-1 flex flex-col justify-between">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Daily Quote</p>
              <p className="text-sm leading-relaxed italic text-foreground/80">&ldquo;{quote}&rdquo;</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

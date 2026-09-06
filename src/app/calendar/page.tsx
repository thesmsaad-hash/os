"use client"

import { useState, useEffect } from "react"
import {
  ChevronLeft, ChevronRight, Plus, X, Clock,
  Calendar as CalendarIcon, RefreshCw, Check, Copy, ExternalLink, Globe, Sparkles
} from "lucide-react"
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
  addWeeks, subWeeks, isToday
} from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCalendarStore } from "@/lib/stores/use-calendar-store"
import type { CalendarEvent } from "@/lib/types/drive"

// ── types ─────────────────────────────────────────────────────────────────────
export interface CalEvent {
  id:       string
  title:    string
  date:     string        // yyyy-MM-dd
  startTime?: string      // HH:mm
  endTime?:   string
  color:    string
  isAllDay?: boolean
  description?: string
  location?: string
  googleEventId?: string
  source?: string
}

const COLOR_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  blue:    { bg: "bg-blue-500/20",    text: "text-blue-400",    dot: "bg-blue-500"    },
  violet:  { bg: "bg-violet-500/20",  text: "text-violet-400",  dot: "bg-violet-500"  },
  emerald: { bg: "bg-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-500" },
  amber:   { bg: "bg-amber-500/20",   text: "text-amber-400",   dot: "bg-amber-500"   },
  red:     { bg: "bg-red-500/20",     text: "text-red-400",     dot: "bg-red-500"     },
  rose:    { bg: "bg-rose-500/20",    text: "text-rose-400",    dot: "bg-rose-500"    },
}
const COLORS = Object.keys(COLOR_MAP)

// ── GoogleCalendarModal ───────────────────────────────────────────────────────
function GoogleCalendarModal({
  onClose,
  onSyncComplete,
}: {
  onClose: () => void
  onSyncComplete: () => void
}) {
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<{ success: boolean; msg: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const feedUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/calendar/feed`
    : "http://localhost:3000/api/calendar/feed"

  const handleSync = async () => {
    setSyncing(true)
    setSyncStatus(null)

    try {
      const gasConfigStr = localStorage.getItem("personal_os_gas_config")
      const gasConfig = gasConfigStr ? JSON.parse(gasConfigStr) : {}

      const res = await fetch("/api/calendar/google-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gas-api-url": gasConfig.url || "",
          "x-gas-api-key": gasConfig.key || "",
        },
        body: JSON.stringify({
          gasUrl: gasConfig.url,
          gasKey: gasConfig.key,
        }),
      })

      const data = await res.json()
      setSyncing(false)

      if (data.success) {
        setSyncStatus({
          success: true,
          msg: `Synced successfully! Imported ${data.importedCount ?? 0} events from Google Calendar.`,
        })
        onSyncComplete()
      } else {
        setSyncStatus({
          success: false,
          msg: data.error || "Sync failed. Check your Apps Script deployment in Settings.",
        })
      }
    } catch (err: unknown) {
      setSyncing(false)
      setSyncStatus({
        success: false,
        msg: err instanceof Error ? err.message : "Sync network error",
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Google Calendar Integration</h2>
              <p className="text-xs text-muted-foreground">Two-way event synchronization with your Google account</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        {/* Method 1: Two-Way Sync */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Method 1: Two-Way Direct Sync
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pulls events from your primary Google Calendar and exports Personal OS events via Google Apps Script.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="w-full gap-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Syncing with Google Calendar..." : "Sync Google Calendar Now"}</span>
          </Button>

          {syncStatus && (
            <p className={`text-xs p-2.5 rounded-md border ${
              syncStatus.success
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                : "bg-amber-500/10 text-amber-400 border-amber-500/25"
            }`}>
              {syncStatus.msg}
            </p>
          )}
        </div>

        {/* Method 2: Live iCal Feed */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-primary" />
              <span>Method 2: Live iCal (.ics) Subscription</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Subscribe to this live feed in Google Calendar, Apple Calendar, or Outlook to automatically show all Personal OS events on your phone!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={feedUrl}
              className="font-mono text-xs h-8 bg-background"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(feedUrl)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="h-8 px-2.5 shrink-0"
              title="Copy feed URL"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <a
              href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1 font-medium"
            >
              <span>Add URL to Google Calendar</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <span className="text-[11px] text-muted-foreground">RFC 5545 Compatible</span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Close</Button>
        </div>
      </div>
    </div>
  )
}

// ── AddEventModal ─────────────────────────────────────────────────────────────
function AddEventModal({
  onClose, onAdd, defaultDate
}: { onClose: () => void; onAdd: (e: Omit<CalEvent, "id">) => void; defaultDate: string }) {
  const [title, setTitle]         = useState("")
  const [date, setDate]           = useState(defaultDate)
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime]     = useState("10:00")
  const [color, setColor]         = useState("blue")
  const [isAllDay, setIsAllDay]   = useState(false)

  const handleAdd = () => {
    if (!title.trim()) return
    onAdd({
      title: title.trim(),
      date,
      startTime: isAllDay ? undefined : startTime,
      endTime: isAllDay ? undefined : endTime,
      color,
      isAllDay,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">New Event</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-col gap-3">
          <Input placeholder="Event title..." value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full text-sm border rounded-md px-3 py-1.5 bg-background" />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isAllDay} onChange={e => setIsAllDay(e.target.checked)} />
            All day event
          </label>
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Start</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full text-sm border rounded-md px-3 py-1.5 bg-background" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">End</label>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full text-sm border rounded-md px-3 py-1.5 bg-background" />
              </div>
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full ${COLOR_MAP[c].dot} ring-2 ring-offset-2 ring-offset-card transition-all ${color === c ? "ring-foreground" : "ring-transparent"}`}
                />
              ))}
            </div>
          </div>
          <Button onClick={handleAdd} className="w-full mt-1" disabled={!title.trim()}>Add Event</Button>
        </div>
      </div>
    </div>
  )
}

// ── MonthView ─────────────────────────────────────────────────────────────────
function MonthView({
  currentDate, events, onDayClick
}: {
  currentDate: Date
  events: CalEvent[]
  onDayClick: (date: string) => void
}) {
  const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
  const end   = endOfWeek(endOfMonth(currentDate),     { weekStartsOn: 1 })
  const days  = eachDayOfInterval({ start, end })
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-7 border-b">
        {dayNames.map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1">
        {days.map((day, i) => {
          const dateStr = format(day, "yyyy-MM-dd")
          const dayEvents = events.filter(e => e.date === dateStr)
          const inMonth   = isSameMonth(day, currentDate)
          const todayDay  = isToday(day)
          return (
            <div
              key={i}
              onClick={() => onDayClick(dateStr)}
              className={`min-h-24 border-b border-r p-2 cursor-pointer transition-colors hover:bg-muted/30 ${
                !inMonth ? "opacity-40" : ""
              }`}
            >
              <div className={`h-7 w-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 ${
                todayDay ? "bg-primary text-primary-foreground" : "text-foreground"
              }`}>
                {format(day, "d")}
              </div>
              {dayEvents.slice(0, 3).map(ev => (
                <div key={ev.id} className={`text-xs rounded px-1.5 py-0.5 mb-0.5 truncate ${COLOR_MAP[ev.color]?.bg ?? ""} ${COLOR_MAP[ev.color]?.text ?? ""}`}>
                  {ev.isAllDay ? "● " : (ev.startTime ? ev.startTime + " " : "")}{ev.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-xs text-muted-foreground px-1">+{dayEvents.length - 3} more</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── WeekView ──────────────────────────────────────────────────────────────────
function WeekView({ currentDate, events }: { currentDate: Date; events: CalEvent[] }) {
  const start    = startOfWeek(currentDate, { weekStartsOn: 1 })
  const end      = endOfWeek(currentDate,   { weekStartsOn: 1 })
  const days     = eachDayOfInterval({ start, end })
  const hours    = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="flex-1 overflow-auto">
      {/* header */}
      <div className="grid grid-cols-8 border-b sticky top-0 bg-background z-10">
        <div className="py-2 px-3 text-xs text-muted-foreground text-right border-r">GMT+5</div>
        {days.map(day => (
          <div key={day.toISOString()} className={`py-2 text-center border-r ${isToday(day) ? "text-primary" : ""}`}>
            <p className="text-xs text-muted-foreground">{format(day, "EEE")}</p>
            <p className={`text-lg font-semibold ${isToday(day) ? "text-primary" : ""}`}>{format(day, "d")}</p>
          </div>
        ))}
      </div>
      {/* grid */}
      <div className="grid grid-cols-8">
        {/* time column */}
        <div className="border-r">
          {hours.map(h => (
            <div key={h} className="h-14 border-b flex items-start pt-1 px-2">
              <span className="text-xs text-muted-foreground">{String(h).padStart(2, "0")}:00</span>
            </div>
          ))}
        </div>
        {/* day columns */}
        {days.map(day => {
          const dateStr  = format(day, "yyyy-MM-dd")
          const dayEvs   = events.filter(e => e.date === dateStr && !e.isAllDay && e.startTime)
          return (
            <div key={dateStr} className={`border-r relative ${isToday(day) ? "bg-primary/3" : ""}`}>
              {hours.map(h => <div key={h} className="h-14 border-b" />)}
              {dayEvs.map(ev => {
                const [sh, sm] = (ev.startTime ?? "0:0").split(":").map(Number)
                const [eh, em] = (ev.endTime   ?? "1:0").split(":").map(Number)
                const top  = (sh * 60 + sm) / 60 * 56      // 14*4=56px per hour
                const height = Math.max(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 56, 28)
                return (
                  <div
                    key={ev.id}
                    className={`absolute left-0.5 right-0.5 rounded px-1.5 py-0.5 overflow-hidden cursor-pointer ${COLOR_MAP[ev.color]?.bg} ${COLOR_MAP[ev.color]?.text} text-xs`}
                    style={{ top: `${top}px`, height: `${height}px` }}
                  >
                    <p className="font-medium truncate">{ev.title}</p>
                    <p className="opacity-80">{ev.startTime}–{ev.endTime}</p>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const today = format(new Date(), "yyyy-MM-dd")

// ── AgendaView ────────────────────────────────────────────────────────────────
function AgendaView({ events }: { events: CalEvent[] }) {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date))
  const groups: Record<string, CalEvent[]> = {}
  sorted.forEach(ev => {
    if (!groups[ev.date]) groups[ev.date] = []
    groups[ev.date].push(ev)
  })
  return (
    <div className="flex-1 overflow-auto p-6 max-w-2xl mx-auto">
      {Object.entries(groups).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-sm">No events scheduled</p>
          <p className="text-xs text-muted-foreground/80 mt-1">Create an event or sync from Google Calendar</p>
        </div>
      ) : (
        Object.entries(groups).map(([date, evs]) => (
          <div key={date} className="mb-6">
            <p className={`text-sm font-semibold mb-3 ${date === today ? "text-primary" : "text-muted-foreground"}`}>
              {date === today ? "Today · " : ""}{format(new Date(date + "T00:00"), "EEEE, MMMM d")}
            </p>
            <div className="flex flex-col gap-2">
              {evs.map(ev => (
                <div key={ev.id} className="flex items-center gap-3 rounded-lg border p-3 hover:border-primary/40 transition-colors cursor-pointer">
                  <div className={`w-1.5 h-10 rounded-full ${COLOR_MAP[ev.color]?.dot || "bg-primary"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ev.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {ev.isAllDay ? "All day" : `${ev.startTime || "All Day"} – ${ev.endTime || ""}`}
                    </p>
                  </div>
                  {ev.source === "google_calendar" && (
                    <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded shrink-0">
                      Google
                    </span>
                  )}
                  {ev.source === "google_assistant" && (
                    <span className="text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded shrink-0">
                      Assistant
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────
type View = "month" | "week" | "agenda"

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView]               = useState<View>("month")
  const [showAdd, setShowAdd]         = useState(false)
  const [showGoogle, setShowGoogle]   = useState(false)
  const [defaultDate, setDefaultDate] = useState(today)

  const { events: storeEvents, loadEvents, addEvent } = useCalendarStore()

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  // Transform store events into CalEvent format
  const events: CalEvent[] = storeEvents.map(e => {
    const anyE = e as any
    const date = anyE.date || (e.start ? e.start.split("T")[0] : today)
    let startTime = anyE.startTime
    let endTime = anyE.endTime
    if (!startTime && e.start && e.start.includes("T")) {
      startTime = e.start.split("T")[1].slice(0, 5)
    }
    if (!endTime && e.end && e.end.includes("T")) {
      endTime = e.end.split("T")[1].slice(0, 5)
    }
    return {
      id: e.id,
      title: e.title,
      date,
      startTime,
      endTime,
      color: anyE.color || "blue",
      isAllDay: anyE.isAllDay ?? anyE.allDay ?? (!startTime && !endTime),
      description: e.description,
      location: anyE.location,
      googleEventId: anyE.googleEventId,
      source: anyE.source,
    }
  })

  const prev = () => {
    if (view === "month") setCurrentDate(d => subMonths(d, 1))
    else                  setCurrentDate(d => subWeeks(d, 1))
  }
  const next = () => {
    if (view === "month") setCurrentDate(d => addMonths(d, 1))
    else                  setCurrentDate(d => addWeeks(d, 1))
  }
  const goToday = () => setCurrentDate(new Date())

  const handleAddEvent = async (ev: Omit<CalEvent, "id">) => {
    const startIso = ev.startTime ? `${ev.date}T${ev.startTime}:00.000Z` : `${ev.date}T09:00:00.000Z`
    const endIso = ev.endTime ? `${ev.date}T${ev.endTime}:00.000Z` : `${ev.date}T10:00:00.000Z`

    await addEvent({
      title: ev.title,
      start: startIso,
      end: endIso,
      date: ev.date,
      startTime: ev.startTime,
      endTime: ev.endTime,
      color: ev.color,
      isAllDay: ev.isAllDay,
    } as any)
  }

  const headerLabel = view === "month"
    ? format(currentDate, "MMMM yyyy")
    : `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d")} – ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d, yyyy")}`

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {showAdd && (
        <AddEventModal
          onClose={() => setShowAdd(false)}
          onAdd={handleAddEvent}
          defaultDate={defaultDate}
        />
      )}

      {showGoogle && (
        <GoogleCalendarModal
          onClose={() => setShowGoogle(false)}
          onSyncComplete={() => loadEvents()}
        />
      )}

      {/* toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b">
        <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={prev}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={next}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <h1 className="text-lg font-semibold flex-1">{headerLabel}</h1>

        <div className="flex border rounded-lg overflow-hidden">
          {(["month", "week", "agenda"] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
                view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Google Calendar Sync Modal Trigger */}
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs text-blue-400 border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-300"
          onClick={() => setShowGoogle(true)}
        >
          <CalendarIcon className="h-3.5 w-3.5 text-blue-400" />
          <span>Google Calendar</span>
        </Button>

        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => { setDefaultDate(today); setShowAdd(true) }}
        >
          <Plus className="h-4 w-4" /> New Event
        </Button>
      </div>

      {view === "month"  && <MonthView currentDate={currentDate} events={events} onDayClick={d => { setDefaultDate(d); setShowAdd(true) }} />}
      {view === "week"   && <WeekView  currentDate={currentDate} events={events} />}
      {view === "agenda" && <AgendaView events={events} />}
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import {
  ChevronLeft, ChevronRight, Plus, Search, Smile,
  Meh, Frown, Heart, Star, Zap, Clock, Tag, X, Edit3, BookOpen
} from "lucide-react"
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameDay, addMonths, subMonths, isToday
} from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useJournalStore, type JournalEntry, type Mood } from "@/lib/stores/use-journal-store"

const MOODS: { value: Mood; emoji: string; label: string; color: string }[] = [
  { value: "great", emoji: "😄", label: "Great",  color: "text-emerald-400" },
  { value: "good",  emoji: "🙂", label: "Good",   color: "text-blue-400"    },
  { value: "okay",  emoji: "😐", label: "Okay",   color: "text-amber-400"   },
  { value: "bad",   emoji: "😟", label: "Bad",    color: "text-orange-400"  },
  { value: "awful", emoji: "😢", label: "Awful",  color: "text-red-400"     },
]

const MOOD_BG: Record<Mood, string> = {
  great: "bg-emerald-500/10 border-emerald-500/20",
  good:  "bg-blue-500/10 border-blue-500/20",
  okay:  "bg-amber-500/10 border-amber-500/20",
  bad:   "bg-orange-500/10 border-orange-500/20",
  awful: "bg-red-500/10 border-red-500/20",
}

const PROMPTS = [
  "What made today special?",
  "What are you grateful for today?",
  "What challenged you today, and how did you handle it?",
  "What did you learn today?",
  "What would you do differently if you could repeat today?",
  "What's on your mind right now?",
  "What progress did you make toward your goals?",
]

// ── Calendar view ─────────────────────────────────────────────────────────────
function CalendarView({
  entries, selected, onSelect
}: { entries: JournalEntry[]; selected: Date; onSelect: (d: Date) => void }) {
  const [month, setMonth] = useState(new Date())
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const end   = endOfWeek(endOfMonth(month),     { weekStartsOn: 1 })
  const days  = eachDayOfInterval({ start, end })
  const dayNames = ["M","T","W","T","F","S","S"]

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMonth(m => subMonths(m, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{format(month, "MMMM yyyy")}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMonth(m => addMonths(m, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map((d, i) => <div key={i} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const entry    = entries.find(e => isSameDay(new Date(e.date), day))
          const isSelect = isSameDay(day, selected)
          const mood     = entry?.mood
          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelect(day)}
              className={`h-8 w-8 mx-auto rounded-full text-xs flex items-center justify-center transition-all relative ${
                isSelect ? "bg-primary text-primary-foreground font-bold" :
                isToday(day)  ? "ring-1 ring-primary text-primary font-semibold" :
                "hover:bg-muted text-muted-foreground"
              }`}
            >
              {format(day, "d")}
              {entry && !isSelect && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px]">
                  {MOODS.find(m => m.value === mood)?.emoji}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Editor ────────────────────────────────────────────────────────────────────
function EntryEditor({
  entry, date, onSave, onNew
}: {
  entry:  JournalEntry | null
  date:   Date
  onSave: (e: { id?: string; date: string; content: string; mood: Mood; tags: string[] }) => void
  onNew:  () => void
}) {
  const [content, setContent] = useState(entry?.content ?? "")
  const [mood, setMood]       = useState<Mood>(entry?.mood ?? "good")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags]       = useState<string[]>(entry?.tags ?? [])
  const [editing, setEditing] = useState(!entry)
  const todayPrompt           = PROMPTS[new Date().getDay() % PROMPTS.length]

  const save = () => {
    onSave({
      id:      entry?.id,
      date:    entry?.date ?? date.toISOString(),
      content, mood, tags,
    })
    setEditing(false)
  }

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      setTags(t => [...new Set([...t, tagInput.trim()])])
      setTagInput("")
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* top bar */}
      <div className="px-8 pt-8 pb-5 border-b">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{format(date, "EEEE, MMMM d, yyyy")}</h1>
            {isToday(date) && <p className="text-xs text-primary mt-0.5">Today</p>}
          </div>
          {entry && !editing && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditing(true)}>
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </Button>
          )}
        </div>

        {/* mood selector */}
        <div className="flex items-center gap-2 mt-4">
          <span className="text-xs text-muted-foreground mr-1">Mood:</span>
          {MOODS.map(m => (
            <button
              key={m.value}
              onClick={() => setMood(m.value)}
              title={m.label}
              className={`text-xl transition-all ${mood === m.value ? "scale-125" : "opacity-40 hover:opacity-70 hover:scale-110"}`}
            >
              {m.emoji}
            </button>
          ))}
        </div>
      </div>

      {/* prompt (only when writing new) */}
      {!entry && (
        <div className="px-8 py-4 border-b bg-primary/5">
          <p className="text-xs text-primary/80 font-medium">✏️ Today's prompt</p>
          <p className="text-sm text-muted-foreground mt-0.5 italic">{todayPrompt}</p>
        </div>
      )}

      {/* content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {editing ? (
          <textarea
            autoFocus
            className="w-full h-full min-h-80 bg-transparent outline-none resize-none text-sm leading-relaxed"
            placeholder={`Write your thoughts for ${format(date, "MMMM d")}...`}
            value={content}
            onChange={e => setContent(e.target.value)}
          />
        ) : entry ? (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{entry.content}</div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground">No entry for this day.</p>
            <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={onNew}>
              <Plus className="h-4 w-4" /> Write entry
            </Button>
          </div>
        )}
      </div>

      {/* tags + save */}
      {editing && (
        <div className="px-8 pb-6 pt-3 border-t space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                #{tag}
                <button onClick={() => setTags(t => t.filter(x => x !== tag))}><X className="h-3 w-3" /></button>
              </span>
            ))}
            <input
              className="text-xs bg-muted/50 rounded-full px-3 py-1 outline-none border border-border/50 focus:border-primary/40"
              placeholder="Add tag (Enter)"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={addTag}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={save} className="gap-2" disabled={!content.trim()}>Save Entry</Button>
            {entry && <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
          </div>
        </div>
      )}

      {/* tags display (view mode) */}
      {!editing && entry && entry.tags.length > 0 && (
        <div className="px-8 pb-6 pt-3 border-t flex items-center gap-2 flex-wrap">
          {entry.tags.map(tag => (
            <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">#{tag}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function JournalPage() {
  const { entries, addEntry, updateEntry, loadEntries, hasLoaded } = useJournalStore()
  const [selected, setSelected] = useState(new Date())
  const [search, setSearch]     = useState("")
  const [newMode, setNewMode]   = useState(false)

  useEffect(() => {
    if (!hasLoaded) loadEntries()
  }, [hasLoaded, loadEntries])

  const selectedEntry = entries.find(e => isSameDay(new Date(e.date), selected))

  const saveEntry = (data: { id?: string; date: string; content: string; mood: Mood; tags: string[] }) => {
    if (data.id && entries.some(e => e.id === data.id)) {
      updateEntry(data.id, data)
    } else {
      addEntry(data)
    }
    setNewMode(false)
  }

  const filteredEntries = search
    ? entries.filter(e => e.content.toLowerCase().includes(search.toLowerCase()) || e.tags.some(t => t.includes(search.toLowerCase())))
    : [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Left panel ── */}
      <div className="w-64 shrink-0 border-r flex flex-col overflow-hidden bg-background/50">
        {/* search */}
        <div className="px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search entries..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs bg-muted/50 border-none" />
          </div>
        </div>

        {/* calendar */}
        <CalendarView entries={entries} selected={selected} onSelect={d => { setSelected(d); setNewMode(false) }} />

        {/* entry list */}
        <div className="flex-1 overflow-auto border-t py-2">
          <p className="text-xs text-muted-foreground px-4 py-2 font-semibold uppercase tracking-wide">Entries</p>
          {filteredEntries.map(entry => {
            const entryDate = new Date(entry.date)
            return (
              <button
                key={entry.id}
                onClick={() => { setSelected(entryDate); setNewMode(false) }}
                className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/30 ${isSameDay(entryDate, selected) ? "bg-primary/10" : ""}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{MOODS.find(m => m.value === entry.mood)?.emoji}</span>
                  <span className="text-xs font-medium">{format(entryDate, "MMM d, yyyy")}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{entry.content}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Editor panel ── */}
      <EntryEditor
        key={`${selected.toDateString()}-${newMode}`}
        entry={newMode ? null : selectedEntry ?? null}
        date={selected}
        onSave={saveEntry}
        onNew={() => setNewMode(true)}
      />
    </div>
  )
}

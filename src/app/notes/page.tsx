"use client"

import { useState, useRef, useEffect } from "react"
import {
  Plus, Search, Star, StarOff, Tag, Folder,
  Trash2, MoreHorizontal, Hash, FileText,
  ChevronRight, Bold, Italic, List, Code,
  Link, Image, AlignLeft, X, Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"

// ── types ─────────────────────────────────────────────────────────────────────
interface Note {
  id:         string
  title:      string
  content:    string
  folder:     string
  tags:       string[]
  isFavorite: boolean
  createdAt:  Date
  updatedAt:  Date
}

// ── mock data ─────────────────────────────────────────────────────────────────
const FOLDERS = ["All Notes", "Personal", "Work", "Projects", "Archive"]
const TAG_COLORS: Record<string, string> = {
  idea:       "bg-violet-500/20 text-violet-400",
  client:     "bg-blue-500/20 text-blue-400",
  video:      "bg-amber-500/20 text-amber-400",
  important:  "bg-red-500/20 text-red-400",
  reference:  "bg-emerald-500/20 text-emerald-400",
  draft:      "bg-slate-500/20 text-slate-400",
}

function uid() { return Math.random().toString(36).slice(2) }

const initialNotes: Note[] = [
  {
    id: "1", title: "Video Content Strategy 2026",
    content: `## Content Strategy\n\nFocus areas for Q4:\n\n- **Tutorial series**: After Effects deep-dives\n- **Client showcase**: 3 case studies per month\n- **Behind the scenes**: Weekly process videos\n\n### Goals\n- Reach 50k subscribers by December\n- Launch premium course\n- Collaborate with 5 creators\n\n> Key insight: Consistency beats perfection.`,
    folder: "Work", tags: ["video", "idea"], isFavorite: true,
    createdAt: new Date("2026-09-03T10:00:00.000Z"), updatedAt: new Date("2026-09-06T09:00:00.000Z"),
  },
  {
    id: "2", title: "Client Meeting Notes - ABC Corp",
    content: `## Meeting Summary\n\n**Date**: September 3, 2026\n**Client**: ABC Corp\n\n### Discussed\n- Brand refresh video package\n- Delivery timeline: 3 weeks\n- Budget: $4,500\n\n### Action Items\n- [ ] Send revised proposal by Friday\n- [ ] Schedule follow-up call next week\n- [ ] Prepare mood board`,
    folder: "Work", tags: ["client", "important"], isFavorite: false,
    createdAt: new Date("2026-09-04T10:00:00.000Z"), updatedAt: new Date("2026-09-05T10:00:00.000Z"),
  },
  {
    id: "3", title: "Book Notes: Deep Work",
    content: `## Deep Work - Cal Newport\n\n### Core Idea\nProfessional activities performed in a state of distraction-free concentration.\n\n### Rules\n1. **Work Deeply** — schedule and ritualize\n2. **Embrace Boredom** — resist distraction\n3. **Quit Social Media** — tools must have clear value\n4. **Drain the Shallows** — minimize shallow work\n\n### My Takeaways\n- Block 4-hour deep work sessions in the morning\n- No phone until after the first deep work block\n- Weekly review every Sunday`,
    folder: "Personal", tags: ["reference", "idea"], isFavorite: true,
    createdAt: new Date("2026-08-30T10:00:00.000Z"), updatedAt: new Date("2026-09-01T10:00:00.000Z"),
  },
  {
    id: "4", title: "Gear Wishlist",
    content: `## Camera Gear\n\n- Sony A7C II body\n- Sigma 35mm f/1.4 Art\n- Aputure 600d Pro\n\n## Audio\n\n- Sennheiser MKH 416\n- Sound Devices MixPre-3 II\n\n## Accessories\n\n- DJI RS 4 Pro gimbal\n- Tilta camera cage`,
    folder: "Personal", tags: ["reference"], isFavorite: false,
    createdAt: new Date("2026-08-27T10:00:00.000Z"), updatedAt: new Date("2026-08-29T10:00:00.000Z"),
  },
  {
    id: "5", title: "Project Ideas — Draft",
    content: `## Untested Ideas\n\n1. Personal finance tracking app for freelancers\n2. AI-powered caption generator\n3. B-roll library with tagging system\n4. Client portal with project tracking\n\n## Next Steps\nResearch market size for idea #4.`,
    folder: "Projects", tags: ["idea", "draft"], isFavorite: false,
    createdAt: new Date("2026-09-05T10:00:00.000Z"), updatedAt: new Date("2026-09-05T10:00:00.000Z"),
  },
]

// ── markdown-lite renderer ─────────────────────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-5 mb-2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-1 text-muted-foreground">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em class="italic">$1</em>')
    .replace(/`(.+?)`/g,       '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary">$1</code>')
    .replace(/^> (.+)$/gm,     '<blockquote class="border-l-2 border-primary pl-4 text-muted-foreground italic my-2">$1</blockquote>')
    .replace(/^- \[ \] (.+)$/gm, '<div class="flex items-center gap-2 my-0.5"><input type="checkbox" class="accent-primary"> $1</div>')
    .replace(/^- \[x\] (.+)$/gm, '<div class="flex items-center gap-2 my-0.5 line-through text-muted-foreground"><input type="checkbox" checked class="accent-primary"> $1</div>')
    .replace(/^- (.+)$/gm,     '<div class="flex items-start gap-2 my-0.5"><span class="text-primary mt-1">•</span><span>$1</span></div>')
    .replace(/^\d+\. (.+)$/gm, '<div class="my-0.5 ml-4 list-item list-decimal">$1</div>')
    .replace(/^---$/gm,        '<hr class="border-border my-4">')
    .replace(/\n{2,}/g,        '<div class="my-3"></div>')
    .replace(/\n/g,            '<br>')
}

// ── NoteEditor ─────────────────────────────────────────────────────────────────
function NoteEditor({
  note, onUpdate, onDelete,
}: {
  note: Note
  onUpdate: (id: string, changes: Partial<Note>) => void
  onDelete: (id: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle]         = useState(note.title)
  const [content, setContent]     = useState(note.content)
  const taRef                     = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setTitle(note.title)
    setContent(note.content)
    setIsEditing(false)
  }, [note.id])

  const save = () => {
    onUpdate(note.id, { title, content, updatedAt: new Date() })
    setIsEditing(false)
  }

  const insertAtCursor = (before: string, after = "") => {
    const ta  = taRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end   = ta.selectionEnd
    const sel   = content.slice(start, end)
    const next  = content.slice(0, start) + before + sel + after + content.slice(end)
    setContent(next)
    setTimeout(() => {
      ta.selectionStart = start + before.length
      ta.selectionEnd   = start + before.length + sel.length
      ta.focus()
    }, 0)
  }

  const allTags = [...new Set(initialNotes.flatMap(n => n.tags))]

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* note header */}
      <div className="px-8 pt-8 pb-4 border-b">
        {isEditing ? (
          <input
            className="text-2xl font-bold w-full bg-transparent outline-none border-b border-primary/30 pb-1"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
        ) : (
          <h1
            className="text-2xl font-bold cursor-text hover:text-foreground/90 transition-colors"
            onClick={() => setIsEditing(true)}
          >
            {note.title}
          </h1>
        )}

        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1" suppressHydrationWarning>
            <Clock className="h-3 w-3" />
            Updated {format(note.updatedAt, "MMM d, yyyy · h:mm aa")}
          </span>
          <span className="flex items-center gap-1">
            <Folder className="h-3 w-3" />
            {note.folder}
          </span>
          <div className="flex items-center gap-1.5">
            {note.tags.map(tag => (
              <span key={tag} className={`px-2 py-0.5 rounded-full text-xs ${TAG_COLORS[tag] ?? "bg-muted text-muted-foreground"}`}>
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* editor toolbar (visible when editing) */}
      {isEditing && (
        <div className="flex items-center gap-1 px-8 py-2 border-b bg-muted/20">
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Bold" onClick={() => insertAtCursor("**", "**")}><Bold className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Italic" onClick={() => insertAtCursor("*", "*")}><Italic className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Code" onClick={() => insertAtCursor("`", "`")}><Code className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Bullet" onClick={() => insertAtCursor("\n- ")}><List className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Heading" onClick={() => insertAtCursor("\n## ")}><AlignLeft className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Checkbox" onClick={() => insertAtCursor("\n- [ ] ")}><List className="h-3.5 w-3.5 opacity-60" /></Button>
          <div className="flex-1" />
          <Button size="sm" onClick={save} className="h-7 text-xs">Save</Button>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="h-7 text-xs text-muted-foreground">Cancel</Button>
        </div>
      )}

      {/* content */}
      <div className="flex-1 overflow-auto px-8 py-6" onClick={() => { if (!isEditing) setIsEditing(true) }}>
        {isEditing ? (
          <textarea
            ref={taRef}
            className="w-full h-full min-h-96 bg-transparent outline-none resize-none text-sm leading-relaxed font-mono"
            value={content}
            onChange={e => setContent(e.target.value)}
          />
        ) : (
          <div
            className="prose-sm max-w-none text-sm leading-relaxed cursor-text"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        )}
      </div>

      {/* bottom bar */}
      <div className="flex items-center justify-between px-8 py-3 border-t bg-background/50 text-xs text-muted-foreground">
        <span>{content.split(/\s+/).filter(Boolean).length} words · {content.length} chars</span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onUpdate(note.id, { isFavorite: !note.isFavorite })}
          >
            {note.isFavorite
              ? <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              : <StarOff className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(note.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── NoteCard (list item) ──────────────────────────────────────────────────────
function NoteCard({ note, isActive, onClick }: { note: Note; isActive: boolean; onClick: () => void }) {
  const preview = note.content.replace(/#{1,6} /g, "").replace(/\*\*/g, "").replace(/\*/g, "").replace(/`/g, "").slice(0, 100)
  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 cursor-pointer rounded-lg mx-2 mb-1 transition-colors ${
        isActive ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium truncate flex-1">{note.title}</p>
        {note.isFavorite && <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0 mt-0.5" />}
      </div>
      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{preview}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-muted-foreground/60" suppressHydrationWarning>{format(note.updatedAt, "MMM d")}</span>
        {note.tags.slice(0, 2).map(tag => (
          <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-full ${TAG_COLORS[tag] ?? "bg-muted text-muted-foreground"}`}>
            #{tag}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function NotesPage() {
  const [notes, setNotes]           = useState<Note[]>(initialNotes)
  const [activeId, setActiveId]     = useState(initialNotes[0].id)
  const [activeFolder, setFolder]   = useState("All Notes")
  const [search, setSearch]         = useState("")
  const [activeTag, setActiveTag]   = useState<string | null>(null)

  const allTags = [...new Set(notes.flatMap(n => n.tags))]

  const filteredNotes = notes.filter(note => {
    if (activeFolder !== "All Notes" && note.folder !== activeFolder) return false
    if (activeTag && !note.tags.includes(activeTag)) return false
    if (search) {
      const q = search.toLowerCase()
      return note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q)
    }
    return true
  })

  const activeNote = notes.find(n => n.id === activeId)

  const addNote = () => {
    const note: Note = {
      id: uid(), title: "Untitled Note", content: "",
      folder: activeFolder === "All Notes" ? "Personal" : activeFolder,
      tags: [], isFavorite: false, createdAt: new Date(), updatedAt: new Date(),
    }
    setNotes(n => [note, ...n])
    setActiveId(note.id)
  }

  const updateNote = (id: string, changes: Partial<Note>) => {
    setNotes(n => n.map(note => note.id === id ? { ...note, ...changes } : note))
  }

  const deleteNote = (id: string) => {
    const remaining = notes.filter(n => n.id !== id)
    setNotes(remaining)
    if (remaining.length > 0) setActiveId(remaining[0].id)
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Folder sidebar ── */}
      <div className="w-44 shrink-0 border-r flex flex-col py-4 px-2 gap-1 bg-background/50">
        <p className="text-xs font-semibold text-muted-foreground px-2 mb-1 uppercase tracking-wide">Folders</p>
        {FOLDERS.map(f => (
          <button
            key={f}
            onClick={() => { setFolder(f); setActiveTag(null) }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors text-left ${
              activeFolder === f && !activeTag
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Folder className="h-3.5 w-3.5" />
            <span className="flex-1 truncate">{f}</span>
            <span className="text-xs opacity-60">
              {f === "All Notes" ? notes.length : notes.filter(n => n.folder === f).length}
            </span>
          </button>
        ))}

        <div className="mt-4 mb-1">
          <p className="text-xs font-semibold text-muted-foreground px-2 uppercase tracking-wide">Tags</p>
        </div>
        {allTags.map(tag => (
          <button
            key={tag}
            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              activeTag === tag
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Hash className="h-3 w-3" />
            {tag}
          </button>
        ))}
      </div>

      {/* ── Note list ── */}
      <div className="w-64 shrink-0 border-r flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/50 border-none"
            />
          </div>
          <Button size="icon" className="h-8 w-8 shrink-0" onClick={addNote}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto py-2">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No notes found</p>
              <Button variant="ghost" size="sm" className="mt-2 text-xs gap-1" onClick={addNote}>
                <Plus className="h-3.5 w-3.5" /> New note
              </Button>
            </div>
          ) : (
            filteredNotes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                isActive={note.id === activeId}
                onClick={() => setActiveId(note.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Editor ── */}
      {activeNote ? (
        <NoteEditor
          key={activeNote.id}
          note={activeNote}
          onUpdate={updateNote}
          onDelete={deleteNote}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <FileText className="h-16 w-16 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground">Select a note or create one</p>
          <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={addNote}>
            <Plus className="h-4 w-4" /> New Note
          </Button>
        </div>
      )}
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import {
  Plus, Search, Grid3X3, List, Bookmark, Tag, Folder,
  ExternalLink, Trash2, Edit2, Link, X, Star, StarOff,
  Globe, Lightbulb, BookOpen, Wrench, Users, FlaskConical, Bot
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { useBookmarkStore, type BookmarkItem } from "@/lib/stores/use-bookmark-store"

function getDomain(url: string) {
  try { return new URL(url).hostname.replace("www.", "") } catch { return url }
}

const CATEGORIES = ["All", "Inspiration", "Tutorials", "Tools", "Clients", "Research", "AI Tools"]

const CAT_ICONS: Record<string, React.ElementType> = {
  All:         Bookmark,
  Inspiration: Lightbulb,
  Tutorials:   BookOpen,
  Tools:       Wrench,
  Clients:     Users,
  Research:    FlaskConical,
  "AI Tools":  Bot,
}

const CAT_COLORS: Record<string, string> = {
  Inspiration: "bg-amber-500/15 text-amber-400",
  Tutorials:   "bg-blue-500/15 text-blue-400",
  Tools:       "bg-violet-500/15 text-violet-400",
  Clients:     "bg-emerald-500/15 text-emerald-400",
  Research:    "bg-cyan-500/15 text-cyan-400",
  "AI Tools":  "bg-rose-500/15 text-rose-400",
}

// ── AddBookmark modal ──────────────────────────────────────────────────────────
function AddBookmarkModal({ onClose, onAdd }: { onClose: () => void; onAdd: (b: Omit<BookmarkItem, "id" | "createdAt" | "updatedAt">) => void }) {
  const [url, setUrl]       = useState("https://")
  const [title, setTitle]   = useState("")
  const [desc, setDesc]     = useState("")
  const [cat, setCat]       = useState("Tools")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags]     = useState<string[]>([])

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) { setTags(t => [...new Set([...t, tagInput.trim()])]); setTagInput("") }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Add Bookmark</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-col gap-3">
          <Input placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} autoFocus />
          <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <textarea className="w-full text-sm border rounded-md px-3 py-2 bg-background resize-none" placeholder="Description..." rows={2} value={desc} onChange={e => setDesc(e.target.value)} />
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Category</label>
            <select value={cat} onChange={e => setCat(e.target.value)} className="w-full text-sm border rounded-md px-3 py-1.5 bg-background">
              {CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map(t => (
                <span key={t} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                  #{t}<button onClick={() => setTags(ts => ts.filter(x => x !== t))}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <input className="w-full text-sm border rounded-md px-3 py-1.5 bg-background outline-none" placeholder="Tag (Enter)" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag} />
          </div>
          <Button
            onClick={() => {
              if (!url.trim() || !title.trim()) return
              onAdd({ url, title, description: desc, category: cat, tags, isFavorite: false })
              onClose()
            }}
            disabled={!url.trim() || !title.trim()}
            className="w-full mt-1"
          >
            Save Bookmark
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── BookmarkCard (grid) ───────────────────────────────────────────────────────
function BookmarkCard({ bm, onDelete, onToggleFav }: { bm: BookmarkItem; onDelete: (id: string) => void; onToggleFav: (id: string) => void }) {
  const domain = getDomain(bm.url)
  return (
    <div className="bg-card border rounded-xl p-4 hover:border-primary/40 transition-all group flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground overflow-hidden">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{domain}</p>
          </div>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CAT_COLORS[bm.category] ?? "bg-muted text-muted-foreground"}`}>
          {bm.category}
        </span>
      </div>

      <h3 className="text-sm font-semibold mb-1 group-hover:text-primary transition-colors">{bm.title}</h3>
      <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{bm.description}</p>

      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
        {bm.tags.slice(0, 3).map(t => (
          <span key={t} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">#{t}</span>
        ))}
      </div>

      <div className="flex items-center gap-1 mt-3 pt-3 border-t opacity-0 group-hover:opacity-100 transition-opacity">
        <a href={bm.url} target="_blank" rel="noopener noreferrer" className="flex-1">
          <Button variant="outline" size="sm" className="w-full gap-1.5 h-8 text-xs"><ExternalLink className="h-3.5 w-3.5" /> Visit</Button>
        </a>
        <button onClick={() => onToggleFav(bm.id)} className="h-8 w-8 flex items-center justify-center rounded-md border text-muted-foreground hover:text-amber-400 transition-colors">
          {bm.isFavorite ? <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" /> : <StarOff className="h-3.5 w-3.5" />}
        </button>
        <button onClick={() => onDelete(bm.id)} className="h-8 w-8 flex items-center justify-center rounded-md border text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── BookmarkRow (list) ────────────────────────────────────────────────────────
function BookmarkRow({ bm, onDelete, onToggleFav }: { bm: BookmarkItem; onDelete: (id: string) => void; onToggleFav: (id: string) => void }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 rounded-lg group transition-colors">
      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Globe className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{bm.title}</p>
        <p className="text-xs text-muted-foreground truncate">{getDomain(bm.url)}</p>
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${CAT_COLORS[bm.category] ?? "bg-muted text-muted-foreground"}`}>{bm.category}</span>
      <div className="flex items-center gap-1.5">
        {bm.tags.slice(0, 2).map(t => <span key={t} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">#{t}</span>)}
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{bm.createdAt ? format(new Date(bm.createdAt), "MMM d") : ""}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <a href={bm.url} target="_blank" rel="noopener noreferrer"><button className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /></button></a>
        <button onClick={() => onToggleFav(bm.id)} className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-amber-400"><Star className={`h-3.5 w-3.5 ${bm.isFavorite ? "text-amber-400 fill-amber-400" : ""}`} /></button>
        <button onClick={() => onDelete(bm.id)} className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function BookmarksPage() {
  const { bookmarks, addBookmark, updateBookmark, deleteBookmark, toggleFavorite, loadBookmarks, hasLoaded } = useBookmarkStore()
  const [category, setCategory]   = useState("All")
  const [search, setSearch]       = useState("")
  const [viewMode, setViewMode]   = useState<"grid"|"list">("grid")
  const [showAdd, setShowAdd]     = useState(false)
  const [favOnly, setFavOnly]     = useState(false)

  useEffect(() => {
    if (!hasLoaded) loadBookmarks()
  }, [hasLoaded, loadBookmarks])

  const filtered = bookmarks.filter(b => {
    if (category !== "All" && b.category !== category) return false
    if (favOnly && !b.isFavorite) return false
    if (search && !(b.title.toLowerCase().includes(search.toLowerCase()) || b.url.toLowerCase().includes(search.toLowerCase()) || b.tags.some(t => t.includes(search.toLowerCase())))) return false
    return true
  })

  return (
    <div className="h-full flex overflow-hidden">
      {showAdd && <AddBookmarkModal onClose={() => setShowAdd(false)} onAdd={addBookmark} />}

      {/* ── Category sidebar ── */}
      <div className="w-48 shrink-0 border-r flex flex-col py-4 px-3 gap-1 bg-background/50">
        <p className="text-xs font-semibold text-muted-foreground px-2 mb-1 uppercase tracking-wide">Categories</p>
        {CATEGORIES.map(cat => {
          const Icon = CAT_ICONS[cat] ?? Bookmark
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors text-left ${
                category === cat ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="flex-1 truncate">{cat}</span>
              <span className="text-xs opacity-60">
                {cat === "All" ? bookmarks.length : bookmarks.filter(b => b.category === cat).length}
              </span>
            </button>
          )
        })}

        <div className="mt-2 border-t pt-2">
          <button
            onClick={() => setFavOnly(f => !f)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors w-full ${
              favOnly ? "bg-amber-500/10 text-amber-400 font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${favOnly ? "fill-amber-400" : ""}`} />
            Favorites
            <span className="ml-auto text-xs opacity-60">{bookmarks.filter(b => b.isFavorite).length}</span>
          </button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          <h1 className="text-xl font-semibold">{category}</h1>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search bookmarks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 bg-muted/50 border-none text-sm" />
          </div>
          <div className="flex-1" />
          <div className="flex border rounded-lg overflow-hidden">
            <button onClick={() => setViewMode("grid")} className={`px-3 py-1.5 ${viewMode==="grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}><Grid3X3 className="h-4 w-4" /></button>
            <button onClick={() => setViewMode("list")} className={`px-3 py-1.5 ${viewMode==="list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}><List className="h-4 w-4" /></button>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Add Bookmark
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Bookmark className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground">No bookmarks found</p>
              <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Add one</Button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(b => <BookmarkCard key={b.id} bm={b} onDelete={deleteBookmark} onToggleFav={toggleFavorite} />)}
            </div>
          ) : (
            <div className="max-w-4xl flex flex-col gap-0.5">
              {filtered.map(b => <BookmarkRow key={b.id} bm={b} onDelete={deleteBookmark} onToggleFav={toggleFavorite} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

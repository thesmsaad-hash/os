"use client"

import { useEffect, useState, useRef } from "react"
import {
  Upload, Search, Grid3X3, List, Folder, FolderOpen,
  Image, Film, FileText, Music, File, Plus, Download,
  Trash2, Eye, Tag, X, MoreHorizontal, HardDrive, RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { useFileStore, type FileItem, type FileType } from "@/lib/stores/use-file-store"

// ── mock data ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  "All Files", "Client Videos", "Assets", "Music", "SFX",
  "Thumbnails", "Logos", "Project Files", "Exports",
]

const FILE_ICONS: Record<FileType, React.ElementType> = {
  image:    Image,
  video:    Film,
  document: FileText,
  audio:    Music,
  other:    File,
}

const FILE_COLORS: Record<FileType, string> = {
  image:    "text-blue-400 bg-blue-500/10",
  video:    "text-violet-400 bg-violet-500/10",
  document: "text-amber-400 bg-amber-500/10",
  audio:    "text-emerald-400 bg-emerald-500/10",
  other:    "text-slate-400 bg-slate-500/10",
}

function formatBytes(b: number) {
  if (b < 1024)       return `${b} B`
  if (b < 1048576)    return `${(b / 1024).toFixed(1)} KB`
  if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`
  return `${(b / 1073741824).toFixed(1)} GB`
}

// ── FileCard (grid) ───────────────────────────────────────────────────────────
function FileCard({ file, onDelete }: { file: FileItem; onDelete: (id: string) => void }) {
  const Icon  = FILE_ICONS[file.type]
  const color = FILE_COLORS[file.type]
  const [menu, setMenu] = useState(false)

  return (
    <div className="bg-card border rounded-xl p-4 hover:border-primary/40 transition-all group relative">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium truncate mb-0.5" title={file.name}>{file.name}</p>
      <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {file.tags.slice(0, 2).map(t => (
          <span key={t} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">#{t}</span>
        ))}
      </div>

      {/* hover actions */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {file.url ? (
          <a
            href={file.downloadUrl || file.url}
            target="_blank"
            rel="noopener noreferrer"
            download={file.name}
            className="h-7 w-7 rounded-md bg-background/90 border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
          </a>
        ) : null}
        <button
          onClick={() => onDelete(file.id)}
          className="h-7 w-7 rounded-md bg-background/90 border flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── FileRow (list) ────────────────────────────────────────────────────────────
function FileRow({ file, onDelete }: { file: FileItem; onDelete: (id: string) => void }) {
  const Icon  = FILE_ICONS[file.type]
  const color = FILE_COLORS[file.type]
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 rounded-lg group transition-colors">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">{file.category}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {file.tags.slice(0, 2).map(t => (
          <span key={t} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">#{t}</span>
        ))}
      </div>
      <span className="text-xs text-muted-foreground w-20 text-right">{formatBytes(file.size)}</span>
      <span className="text-xs text-muted-foreground w-28 text-right">{format(new Date(file.createdAt), "MMM d, yyyy")}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {file.url ? (
          <a
            href={file.downloadUrl || file.url}
            target="_blank"
            rel="noopener noreferrer"
            download={file.name}
            className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" />
          </a>
        ) : null}
        <button onClick={() => onDelete(file.id)} className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function FilesPage() {
  const { files, uploadFile, deleteFile, isUploading, loadFiles, hasLoaded } = useFileStore()
  const [category, setCategory]   = useState("All Files")
  const [search, setSearch]       = useState("")
  const [viewMode, setViewMode]   = useState<"grid"|"list">("grid")
  const [typeFilter, setTypeFilter] = useState<FileType|"all">("all")
  const fileInputRef              = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!hasLoaded) loadFiles()
  }, [hasLoaded, loadFiles])

  const filtered = files.filter(f => {
    if (category !== "All Files" && f.category !== category) return false
    if (typeFilter !== "all" && f.type !== typeFilter) return false
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalSize = files.reduce((a, f) => a + f.size, 0)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files ?? [])
    for (const f of fileList) {
      await uploadFile(f, category === "All Files" ? "Assets" : category)
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const TYPE_FILTERS: { value: FileType|"all"; label: string; icon: React.ElementType }[] = [
    { value:"all",      label:"All",       icon: HardDrive },
    { value:"video",    label:"Videos",    icon: Film      },
    { value:"image",    label:"Images",    icon: Image     },
    { value:"audio",    label:"Audio",     icon: Music     },
    { value:"document", label:"Docs",      icon: FileText  },
  ]

  return (
    <div className="h-full flex overflow-hidden">
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />

      {/* ── Category sidebar ── */}
      <div className="w-52 shrink-0 border-r flex flex-col py-4 px-3 gap-1 bg-background/50 overflow-auto">
        <p className="text-xs font-semibold text-muted-foreground px-2 mb-1 uppercase tracking-wide">Categories</p>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors text-left ${
              category === cat ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {category === cat ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />}
            <span className="flex-1 truncate">{cat}</span>
            <span className="text-xs opacity-60">
              {cat === "All Files" ? files.length : files.filter(f => f.category === cat).length}
            </span>
          </button>
        ))}

        {/* storage summary */}
        <div className="mt-auto pt-4 border-t mx-2">
          <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
            <HardDrive className="h-3.5 w-3.5" />
            <span>Storage</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: "42%" }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{formatBytes(totalSize)} used</p>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* toolbar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          <h1 className="text-xl font-semibold">{category}</h1>
          <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
            {TYPE_FILTERS.map(f => (
              <button key={f.value} onClick={() => setTypeFilter(f.value)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  typeFilter === f.value ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <f.icon className="h-3.5 w-3.5" /> {f.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 bg-muted/50 border-none text-sm" />
          </div>
          <div className="flex-1" />
          <div className="flex border rounded-lg overflow-hidden">
            <button onClick={() => setViewMode("grid")} className={`px-3 py-1.5 ${viewMode==="grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}><Grid3X3 className="h-4 w-4" /></button>
            <button onClick={() => setViewMode("list")} className={`px-3 py-1.5 ${viewMode==="list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}><List className="h-4 w-4" /></button>
          </div>
          {isUploading && (
            <span className="text-xs text-primary flex items-center gap-1.5 font-medium animate-pulse">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Uploading to Google Drive...
            </span>
          )}
          <Button size="sm" disabled={isUploading} className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </div>

        {/* file list */}
        <div className="flex-1 overflow-auto p-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <HardDrive className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground">No files found</p>
              <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> Upload files
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map(f => <FileCard key={f.id} file={f} onDelete={deleteFile} />)}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted/20 transition-all min-h-36"
              >
                <Plus className="h-6 w-6 opacity-40" />
                <span className="text-xs">Upload</span>
              </button>
            </div>
          ) : (
            <div className="max-w-4xl">
              <div className="flex items-center gap-4 px-4 py-2 text-xs text-muted-foreground border-b mb-2">
                <div className="w-9 shrink-0" />
                <div className="flex-1">Name</div>
                <div className="w-32">Category</div>
                <div className="w-20 text-right">Size</div>
                <div className="w-28 text-right">Date</div>
                <div className="w-16" />
              </div>
              {filtered.map(f => <FileRow key={f.id} file={f} onDelete={deleteFile} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

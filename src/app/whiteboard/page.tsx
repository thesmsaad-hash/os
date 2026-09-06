"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import getStroke from "perfect-freehand"
import {
  Pen, Eraser, Square, Circle, Minus, ArrowRight,
  Type, StickyNote, Hand, Undo2, Redo2, Trash2,
  ZoomIn, ZoomOut, Maximize2, Download, Plus,
  ChevronLeft, ChevronRight, Palette, Grid3X3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  useWhiteboardStore,
  type Tool,
  type Point,
  type DrawElement,
  type Board,
} from "@/lib/stores/use-whiteboard-store"

// ── helpers ───────────────────────────────────────────────────────────────────
function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return ""
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ["M", ...stroke[0], "Q"] as (string | number)[]
  )
  d.push("Z")
  return d.join(" ")
}

function uid() { return Math.random().toString(36).slice(2) }

const COLORS = [
  "#e879f9", "#818cf8", "#38bdf8", "#34d399",
  "#fbbf24", "#f87171", "#ffffff", "#94a3b8",
]

const STROKE_WIDTHS = [2, 4, 8, 14]

const STICKY_BG = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#e9d5ff"]

// ── Canvas renderer ───────────────────────────────────────────────────────────
function renderElement(ctx: CanvasRenderingContext2D, el: DrawElement, scale: number) {
  ctx.save()
  ctx.strokeStyle = el.color
  ctx.lineWidth   = el.strokeW
  ctx.lineCap     = "round"
  ctx.lineJoin    = "round"

  if (el.type === "pen" && el.points?.length) {
    const stroke = getStroke(el.points.map(p => [p.x, p.y]), {
      size: el.strokeW * 2,
      smoothing: 0.5,
      thinning: 0.4,
    })
    const path = new Path2D(getSvgPathFromStroke(stroke))
    ctx.fillStyle = el.color
    ctx.fill(path)
  }

  if (el.type === "eraser" && el.points?.length) {
    ctx.globalCompositeOperation = "destination-out"
    ctx.beginPath()
    el.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
    ctx.lineWidth = el.strokeW * 4
    ctx.stroke()
    ctx.globalCompositeOperation = "source-over"
  }

  if (el.type === "rect" && el.x !== undefined) {
    ctx.beginPath()
    ctx.roundRect(el.x, el.y!, el.w!, el.h!, 4)
    ctx.stroke()
  }

  if (el.type === "ellipse" && el.x !== undefined) {
    ctx.beginPath()
    ctx.ellipse(el.x + el.w! / 2, el.y! + el.h! / 2, Math.abs(el.w! / 2), Math.abs(el.h! / 2), 0, 0, Math.PI * 2)
    ctx.stroke()
  }

  if ((el.type === "line" || el.type === "arrow") && el.x !== undefined) {
    ctx.beginPath()
    ctx.moveTo(el.x, el.y!)
    ctx.lineTo(el.x2!, el.y2!)
    ctx.stroke()
    if (el.type === "arrow") {
      const angle = Math.atan2(el.y2! - el.y!, el.x2! - el.x!)
      const hl = 18
      ctx.beginPath()
      ctx.moveTo(el.x2!, el.y2!)
      ctx.lineTo(el.x2! - hl * Math.cos(angle - 0.4), el.y2! - hl * Math.sin(angle - 0.4))
      ctx.moveTo(el.x2!, el.y2!)
      ctx.lineTo(el.x2! - hl * Math.cos(angle + 0.4), el.y2! - hl * Math.sin(angle + 0.4))
      ctx.stroke()
    }
  }

  ctx.restore()
}

// ── StickyNote overlay ────────────────────────────────────────────────────────
function StickyNoteEl({
  el, pan, scale, onUpdate,
}: {
  el: DrawElement; pan: Point; scale: number; onUpdate: (id: string, text: string) => void
}) {
  return (
    <div
      className="absolute rounded-lg shadow-lg p-3 flex flex-col text-sm font-medium text-slate-800 resize overflow-hidden"
      style={{
        left:       el.x! * scale + pan.x,
        top:        el.y! * scale + pan.y,
        width:      (el.w ?? 180) * scale,
        height:     (el.h ?? 120) * scale,
        background: el.bgColor ?? "#fef08a",
        fontSize:   13 * scale,
      }}
    >
      <textarea
        className="flex-1 bg-transparent resize-none outline-none text-slate-800 placeholder:text-slate-500"
        placeholder="Note..."
        value={el.text ?? ""}
        style={{ fontSize: 13 * scale }}
        onChange={e => onUpdate(el.id, e.target.value)}
      />
    </div>
  )
}

// ── TextInput overlay ─────────────────────────────────────────────────────────
function TextInputEl({
  el, pan, scale, onUpdate,
}: {
  el: DrawElement; pan: Point; scale: number; onUpdate: (id: string, text: string) => void
}) {
  return (
    <input
      autoFocus
      className="absolute bg-transparent outline-none border-b border-dashed"
      style={{
        left:      el.x! * scale + pan.x,
        top:       el.y! * scale + pan.y,
        fontSize:  18 * scale,
        color:     el.color,
        minWidth:  120,
      }}
      value={el.text ?? ""}
      onChange={e => onUpdate(el.id, e.target.value)}
    />
  )
}

// ── BoardList ─────────────────────────────────────────────────────────────────
function BoardList({
  boards, activeId, onSelect, onNew,
}: {
  boards: Board[]; activeId: string; onSelect: (id: string) => void; onNew: () => void
}) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b bg-background/60 backdrop-blur-sm overflow-x-auto">
      {boards.map(b => (
        <button
          key={b.id}
          onClick={() => onSelect(b.id)}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
            b.id === activeId
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {b.name}
        </button>
      ))}
      <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 shrink-0" onClick={onNew}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function WhiteboardPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const {
    boards,
    activeBoardId,
    setActiveBoardId,
    loadBoards,
    addBoard,
    updateBoardElements,
    hasLoaded,
  } = useWhiteboardStore()

  useEffect(() => {
    if (!hasLoaded) loadBoards()
  }, [hasLoaded, loadBoards])

  const [tool, setTool]           = useState<Tool>("pen")
  const [color, setColor]         = useState(COLORS[1])
  const [strokeW, setStrokeW]     = useState(4)
  const [stickyBg, setStickyBg]   = useState(STICKY_BG[0])
  const [showGrid, setShowGrid]   = useState(false)
  const [showPalette, setShowPalette] = useState(false)

  const [pan, setPan]             = useState<Point>({ x: 0, y: 0 })
  const [scale, setScale]         = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const panStart                  = useRef<Point>({ x: 0, y: 0 })
  const panOrigin                 = useRef<Point>({ x: 0, y: 0 })

  const [history, setHistory]     = useState<DrawElement[][]>([[]])
  const [histIdx, setHistIdx]     = useState(0)

  const drawing                   = useRef(false)
  const currentEl                 = useRef<DrawElement | null>(null)
  const startPt                   = useRef<Point>({ x: 0, y: 0 })

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0]
  const elements    = activeBoard?.elements ?? []

  // ── helpers ──
  const worldPt = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left - pan.x) / scale,
      y: (e.clientY - rect.top  - pan.y) / scale,
    }
  }, [pan, scale])

  const setElements = useCallback((els: DrawElement[]) => {
    if (activeBoardId) {
      updateBoardElements(activeBoardId, els)
    }
  }, [activeBoardId, updateBoardElements])

  const pushHistory = useCallback((els: DrawElement[]) => {
    setHistory(h => [...h.slice(0, histIdx + 1), els])
    setHistIdx(i => i + 1)
  }, [histIdx])

  const undo = useCallback(() => {
    if (histIdx <= 0) return
    const newIdx = histIdx - 1
    setHistIdx(newIdx)
    setElements(history[newIdx] ?? [])
  }, [histIdx, history, setElements])

  const redo = useCallback(() => {
    if (histIdx >= history.length - 1) return
    const newIdx = histIdx + 1
    setHistIdx(newIdx)
    setElements(history[newIdx])
  }, [histIdx, history, setElements])

  // ── keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); undo() }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") { e.preventDefault(); redo() }
      if (e.key === "p") setTool("pen")
      if (e.key === "e") setTool("eraser")
      if (e.key === "r") setTool("rect")
      if (e.key === "c") setTool("ellipse")
      if (e.key === "t") setTool("text")
      if (e.key === "s") setTool("sticky")
      if (e.key === "h") setTool("select")
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [undo, redo])

  // ── render canvas ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx    = canvas.getContext("2d")!

    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // grid
    if (showGrid) {
      ctx.save()
      ctx.strokeStyle = "rgba(255,255,255,0.04)"
      ctx.lineWidth   = 1
      const gSize     = 40 * scale
      const ox        = pan.x % gSize
      const oy        = pan.y % gSize
      for (let x = ox; x < canvas.width;  x += gSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke() }
      for (let y = oy; y < canvas.height; y += gSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);  ctx.stroke() }
      ctx.restore()
    }

    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(scale, scale)

    elements
      .filter(el => el.type !== "sticky" && el.type !== "text")
      .forEach(el => renderElement(ctx, el, scale))

    ctx.restore()
  }, [elements, pan, scale, showGrid])

  // ── pointer events ──
  const onPointerDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === "select") {
      setIsPanning(true)
      panStart.current  = { x: e.clientX, y: e.clientY }
      panOrigin.current = { ...pan }
      return
    }
    drawing.current = true
    const pt = worldPt(e)

    if (tool === "sticky") {
      const el: DrawElement = {
        id: uid(), type: "sticky", x: pt.x, y: pt.y, w: 180, h: 120,
        color, strokeW, bgColor: stickyBg, text: "",
      }
      const next = [...elements, el]
      setElements(next)
      pushHistory(next)
      drawing.current = false
      return
    }

    if (tool === "text") {
      const el: DrawElement = {
        id: uid(), type: "text", x: pt.x, y: pt.y,
        color, strokeW, text: "",
      }
      const next = [...elements, el]
      setElements(next)
      pushHistory(next)
      drawing.current = false
      return
    }

    const el: DrawElement = {
      id: uid(), type: tool,
      points: [pt],
      x: pt.x, y: pt.y, x2: pt.x, y2: pt.y, w: 0, h: 0,
      color, strokeW,
    }
    currentEl.current = el
    startPt.current   = pt
    setElements([...elements, el])
  }, [tool, pan, worldPt, elements, color, strokeW, stickyBg, setElements, pushHistory])

  const onPointerMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPan({
        x: panOrigin.current.x + e.clientX - panStart.current.x,
        y: panOrigin.current.y + e.clientY - panStart.current.y,
      })
      return
    }
    if (!drawing.current || !currentEl.current) return
    const pt = worldPt(e)

    setElements(elements.map(el => {
      if (el.id !== currentEl.current!.id) return el
      if (el.type === "pen" || el.type === "eraser") {
        return { ...el, points: [...(el.points ?? []), pt] }
      }
      return {
        ...el,
        x2: pt.x, y2: pt.y,
        w: pt.x - startPt.current.x,
        h: pt.y - startPt.current.y,
      }
    }))
  }, [isPanning, worldPt, elements, setElements])

  const onPointerUp = useCallback(() => {
    if (isPanning) { setIsPanning(false); return }
    if (!drawing.current) return
    drawing.current   = false
    pushHistory(elements)
    currentEl.current = null
  }, [isPanning, elements, pushHistory])

  // ── wheel zoom ──
  const onWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const delta  = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.1, Math.min(5, scale * delta))
    const rect   = canvasRef.current!.getBoundingClientRect()
    const cx     = e.clientX - rect.left
    const cy     = e.clientY - rect.top
    setPan(p => ({
      x: cx - (cx - p.x) * (newScale / scale),
      y: cy - (cy - p.y) * (newScale / scale),
    }))
    setScale(newScale)
  }, [scale])

  const updateElText = (id: string, text: string) => {
    setElements(elements.map(el => el.id === id ? { ...el, text } : el))
  }

  const clearBoard = () => {
    setElements([])
    pushHistory([])
  }

  const exportPNG = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement("a")
    link.download = `${activeBoard.name}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  const TOOLS: { id: Tool; icon: React.ElementType; label: string; key: string }[] = [
    { id: "select",  icon: Hand,       label: "Pan (H)",       key: "H" },
    { id: "pen",     icon: Pen,        label: "Pen (P)",       key: "P" },
    { id: "eraser",  icon: Eraser,     label: "Eraser (E)",    key: "E" },
    { id: "rect",    icon: Square,     label: "Rect (R)",      key: "R" },
    { id: "ellipse", icon: Circle,     label: "Ellipse (C)",   key: "C" },
    { id: "line",    icon: Minus,      label: "Line",          key: "" },
    { id: "arrow",   icon: ArrowRight, label: "Arrow",         key: "" },
    { id: "text",    icon: Type,       label: "Text (T)",      key: "T" },
    { id: "sticky",  icon: StickyNote, label: "Sticky (S)",    key: "S" },
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[oklch(0.1_0.018_264)]">
      {/* Board tabs */}
      <BoardList
        boards={boards}
        activeId={activeBoardId}
        onSelect={setActiveBoardId}
        onNew={() => addBoard("New Board")}
      />

      {/* Canvas area */}
      <div className="flex-1 relative overflow-hidden">
        {/* floating toolbar */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-6 z-30 flex items-center gap-1 bg-card/90 backdrop-blur-md border rounded-xl px-3 py-2 shadow-2xl">
          {TOOLS.map(t => (
            <button
              key={t.id}
              title={t.label}
              onClick={() => setTool(t.id)}
              className={`h-9 w-9 flex items-center justify-center rounded-lg transition-colors ${
                tool === t.id
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <t.icon className="h-4.5 w-4.5" />
            </button>
          ))}

          <div className="w-px h-6 bg-border mx-1" />

          {/* Stroke width */}
          {STROKE_WIDTHS.map(w => (
            <button
              key={w}
              title={`Stroke ${w}`}
              onClick={() => setStrokeW(w)}
              className={`h-9 w-9 flex items-center justify-center rounded-lg transition-colors ${
                strokeW === w ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: Math.min(w * 1.8, 16), height: Math.min(w * 1.8, 16) }}
              />
            </button>
          ))}

          <div className="w-px h-6 bg-border mx-1" />

          {/* Color picker */}
          <div className="relative">
            <button
              onClick={() => setShowPalette(p => !p)}
              className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              title="Color"
            >
              <div className="h-5 w-5 rounded-full border-2 border-white/30" style={{ background: color }} />
            </button>
            {showPalette && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-card border rounded-xl p-3 shadow-2xl flex flex-col gap-2">
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => { setColor(c); setShowPalette(false) }}
                      className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ background: c, borderColor: c === color ? "white" : "transparent" }}
                    />
                  ))}
                </div>
                {tool === "sticky" && (
                  <>
                    <p className="text-xs text-muted-foreground">Sticky color</p>
                    <div className="flex gap-2">
                      {STICKY_BG.map(c => (
                        <button
                          key={c}
                          onClick={() => { setStickyBg(c); setShowPalette(false) }}
                          className="h-7 w-7 rounded-md border-2"
                          style={{ background: c, borderColor: c === stickyBg ? "#333" : "transparent" }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* top-right controls */}
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
          <div className="flex items-center gap-1 bg-card/90 backdrop-blur-md border rounded-lg px-2 py-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.max(0.1, s - 0.1))}><ZoomOut className="h-4 w-4" /></Button>
            <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.min(5, s + 0.1))}><ZoomIn className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setScale(1); setPan({ x: 0, y: 0 }) }}><Maximize2 className="h-4 w-4" /></Button>
          </div>
          <div className="flex items-center gap-1 bg-card/90 backdrop-blur-md border rounded-lg px-2 py-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={undo} title="Undo (Ctrl+Z)"><Undo2 className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={redo} title="Redo (Ctrl+Y)"><Redo2 className="h-4 w-4" /></Button>
          </div>
          <div className="flex items-center gap-1 bg-card/90 backdrop-blur-md border rounded-lg px-2 py-1">
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => setShowGrid(g => !g)}
              title="Toggle Grid"
            >
              <Grid3X3 className={`h-4 w-4 ${showGrid ? "text-primary" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={exportPNG} title="Export PNG"><Download className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={clearBoard} title="Clear Board"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* keyboard shortcut hint */}
        <div className="absolute top-4 left-4 z-30 text-xs text-muted-foreground/50 select-none pointer-events-none">
          P=Pen · E=Eraser · R=Rect · C=Circle · T=Text · S=Sticky · H=Pan · Scroll=Zoom
        </div>

        {/* canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none"
          style={{ cursor: tool === "select" ? (isPanning ? "grabbing" : "grab") : tool === "eraser" ? "cell" : "crosshair" }}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onWheel={onWheel}
        />

        {/* sticky note overlays */}
        {elements.filter(el => el.type === "sticky").map(el => (
          <StickyNoteEl key={el.id} el={el} pan={pan} scale={scale} onUpdate={updateElText} />
        ))}

        {/* text input overlays */}
        {elements.filter(el => el.type === "text").map(el => (
          <TextInputEl key={el.id} el={el} pan={pan} scale={scale} onUpdate={updateElText} />
        ))}
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Play, Pause, SkipForward, RotateCcw,
  Coffee, Brain, Volume2, VolumeX, Plus,
  CheckCircle2, Circle, Waves, Wind, Trees, CloudRain, Radio, Bell
} from "lucide-react"
import { format } from "date-fns"
import { sendNtfyNotification, getNtfyConfig } from "@/lib/ntfy"
import { useTaskStore } from "@/lib/stores/use-task-store"

// ── types ─────────────────────────────────────────────────────────────────────
type Phase = "focus" | "short-break" | "long-break"
interface Mode { label: string; focus: number; short: number; long: number; rounds: number }

const MODES: Record<string, Mode> = {
  pomodoro: { label: "Pomodoro", focus: 25, short: 5,  long: 15, rounds: 4 },
  extended: { label: "50 / 10",  focus: 50, short: 10, long: 30, rounds: 4 },
  custom:   { label: "Custom",   focus: 45, short: 10, long: 20, rounds: 4 },
}

const PHASE_META = {
  "focus":       { label: "Focus Time",  ring: "#a78bfa", glow: "#7c3aed", dim: "#3b1f7a", textClass: "text-violet-300"  },
  "short-break": { label: "Short Break", ring: "#34d399", glow: "#059669", dim: "#0d3b2e", textClass: "text-emerald-300" },
  "long-break":  { label: "Long Break",  ring: "#38bdf8", glow: "#0284c7", dim: "#082f4a", textClass: "text-sky-300"     },
} as const

const AMBIENT = [
  { id: "rain",   label: "Rain",   icon: CloudRain },
  { id: "cafe",   label: "Cafe",   icon: Coffee    },
  { id: "forest", label: "Forest", icon: Trees     },
  { id: "ocean",  label: "Ocean",  icon: Waves     },
  { id: "wind",   label: "Wind",   icon: Wind      },
  { id: "lofi",   label: "Lo-Fi",  icon: Radio     },
]

function uid() { return Math.random().toString(36).slice(2) }
function pad(n: number) { return n.toString().padStart(2, "0") }
function fmtTime(s: number) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}` }

// ── Ring ──────────────────────────────────────────────────────────────────────
function Ring({ progress, color, glow }: { progress: number; color: string; glow: string }) {
  const SIZE = 340
  const cx   = SIZE / 2
  const r    = 145
  const circ = 2 * Math.PI * r
  // Always show at least a tiny arc so the ring is visible even at 0%
  const filled = Math.max(progress * circ, 8)

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="absolute inset-0 -rotate-90" style={{ overflow: "visible" }}>
      {/* track */}
      <circle cx={cx} cy={cx} r={r} fill="none"
        stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
      {/* progress arc */}
      <circle cx={cx} cy={cx} r={r} fill="none"
        stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`}
        style={{
          filter: `drop-shadow(0 0 10px ${color}bb) drop-shadow(0 0 24px ${glow}77)`,
          transition: "stroke-dasharray 0.85s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
      {/* leading dot glow */}
      {progress < 0.98 && (
        <circle
          cx={cx + r * Math.cos((progress * 2 * Math.PI) - Math.PI / 2)}
          cy={cx + r * Math.sin((progress * 2 * Math.PI) - Math.PI / 2)}
          r={6} fill={color}
          style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: "cx 0.85s, cy 0.85s" }}
        />
      )}
    </svg>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function FocusPage() {
  const { tasks, toggleTask, addTask: storeAddTask, loadTasks, hasLoaded } = useTaskStore()
  const [modeKey, setModeKey]       = useState<keyof typeof MODES>("pomodoro")
  const [phase, setPhase]           = useState<Phase>("focus")
  const [round, setRound]           = useState(1)
  const [running, setRunning]       = useState(false)
  const [muted, setMuted]           = useState(false)
  const [ambient, setAmbient]       = useState<string | null>(null)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [newTask, setNewTask]       = useState("")
  const [sessions, setSessions]     = useState<{ phase: Phase; at: Date }[]>([])
  const [ntfyTopic, setNtfyTopic]   = useState("personal-os-saad")
  const [ntfySent, setNtfySent]     = useState(false)
  const intervalRef                 = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!hasLoaded) loadTasks()
  }, [hasLoaded, loadTasks])

  useEffect(() => {
    if (!activeTaskId && tasks.length > 0) {
      const firstIncomplete = tasks.find(t => t.status !== "Done")
      if (firstIncomplete) setActiveTaskId(firstIncomplete.id)
    }
  }, [tasks, activeTaskId])

  const cfg  = MODES[modeKey]
  const meta = PHASE_META[phase]

  useEffect(() => {
    const c = getNtfyConfig()
    setNtfyTopic(c.topic)
    const listener = () => setNtfyTopic(getNtfyConfig().topic)
    window.addEventListener("ntfy-config-updated", listener)
    return () => window.removeEventListener("ntfy-config-updated", listener)
  }, [])

  const totalSecs: Record<Phase, number> = {
    "focus":       cfg.focus * 60,
    "short-break": cfg.short * 60,
    "long-break":  cfg.long  * 60,
  }

  const [secs, setSecs] = useState(totalSecs["focus"])

  useEffect(() => { setSecs(totalSecs[phase]); setRunning(false) }, [modeKey, phase])

  const handlePhaseEnd = useCallback(() => {
    setSessions(p => [...p, { phase, at: new Date() }])
    if (phase === "focus") {
      sendNtfyNotification({
        title: "🎯 Focus Session Completed!",
        message: `Great job! Completed ${cfg.focus} mins of deep work (${cfg.label}). Time for a ${round >= cfg.rounds ? "long" : "short"} break!`,
        priority: 4,
        tags: ["tada", "brain", "hourglass_flowing_sand"],
        eventType: "focusMode",
      })
      if (round >= cfg.rounds) { setPhase("long-break"); setRound(1) }
      else { setPhase("short-break"); setRound(r => r + 1) }
    } else {
      sendNtfyNotification({
        title: "⚡ Break Ended!",
        message: "Time to get back in the zone! Ready for your next focus session?",
        priority: 3,
        tags: ["bell", "zap"],
        eventType: "focusMode",
      })
      setPhase("focus")
    }
  }, [phase, round, cfg.rounds, cfg.focus, cfg.label])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecs(s => {
          if (s <= 1) { clearInterval(intervalRef.current!); setRunning(false); handlePhaseEnd(); return 0 }
          return s - 1
        })
      }, 1000)
    } else clearInterval(intervalRef.current!)
    return () => clearInterval(intervalRef.current!)
  }, [running, handlePhaseEnd])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.code === "Space") { e.preventDefault(); setRunning(r => !r) }
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [])

  const skip     = () => { setRunning(false); handlePhaseEnd() }
  const reset    = () => { setRunning(false); setSecs(totalSecs[phase]) }
  const progress = 1 - secs / totalSecs[phase]

  const focusDone  = sessions.filter(s => s.phase === "focus").length
  const focusMins  = focusDone * cfg.focus
  const tasksDone  = tasks.filter(t => t.status === "Done").length
  const activeTask = tasks.find(t => t.id === activeTaskId)

  const handleAddTask = () => {
    if (!newTask.trim()) return
    storeAddTask({
      title: newTask.trim(),
      status: "Todo",
      priority: "Medium",
      tags: ["focus"],
    })
    setNewTask("")
  }

  const PHASES: { id: Phase; label: string }[] = [
    { id: "focus",       label: "Focus"       },
    { id: "short-break", label: "Short Break" },
    { id: "long-break",  label: "Long Break"  },
  ]

  return (
    <div className="h-full flex overflow-hidden transition-colors duration-700"
      style={{ background: `radial-gradient(ellipse 65% 65% at 38% 55%, ${meta.dim}cc 0%, #0c0b18 65%)` }}>

      {/* ── LEFT: Timer ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* top nav bar */}
        <div className="flex items-center gap-4 px-6 pt-5 pb-3 flex-wrap">
          {/* mode pills */}
          <div className="flex gap-0.5 bg-white/5 border border-white/8 rounded-xl p-1 shrink-0">
            {Object.entries(MODES).map(([key, m]) => (
              <button key={key} onClick={() => setModeKey(key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  modeKey === key ? "bg-white/14 text-white" : "text-white/35 hover:text-white/65"
                }`}>{m.label}</button>
            ))}
          </div>

          {/* phase tabs */}
          <div className="flex gap-1 shrink-0">
            {PHASES.map(p => (
              <button key={p.id} onClick={() => { setPhase(p.id); setRunning(false) }}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  phase === p.id
                    ? "text-white border-white/20"
                    : "text-white/30 border-transparent hover:text-white/55"
                }`}
                style={phase === p.id ? { background: meta.ring + "22", borderColor: meta.ring + "44" } : {}}
              >{p.label}</button>
            ))}
          </div>

          <div className="flex-1" />

          {/* round dots */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-white/25">Round</span>
            {Array.from({ length: cfg.rounds }).map((_, i) => (
              <div key={i} className="h-2.5 w-2.5 rounded-full transition-all duration-300"
                style={{
                  background: i < round ? meta.ring : "rgba(255,255,255,0.1)",
                  boxShadow: i === round - 1 && phase === "focus" ? `0 0 8px ${meta.ring}` : "none",
                  transform: i === round - 1 && phase === "focus" && running ? "scale(1.4)" : "scale(1)",
                }}
              />
            ))}
          </div>

          {/* ntfy push indicator */}
          <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-white/10">
            <button
              onClick={async () => {
                setNtfySent(true)
                await sendNtfyNotification({
                  title: "🔔 Focus Mode Alert",
                  message: `ntfy test from Personal OS Focus (${cfg.label} - ${cfg.focus}m)`,
                  priority: 4,
                  tags: ["timer_clock", "brain", "zap"],
                })
                setTimeout(() => setNtfySent(false), 3500)
              }}
              title={`ntfy topic: ${ntfyTopic} (Click to send a test alert)`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
            >
              <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
              <span className="font-mono text-[11px] text-white/70">{ntfyTopic}</span>
              {ntfySent && <span className="text-[10px] text-emerald-300 font-semibold ml-1">✓ Sent!</span>}
            </button>
          </div>
        </div>

        {/* ring + timer (center) */}
        <div className="flex-1 flex flex-col items-center justify-center gap-5">

          {/* ring container */}
          <div className="relative flex items-center justify-center" style={{ width: 340, height: 340 }}>
            {/* soft background glow inside ring */}
            <div className="absolute rounded-full transition-all duration-1000 pointer-events-none"
              style={{
                width: 260, height: 260,
                background: `radial-gradient(circle, ${meta.ring}18 0%, transparent 70%)`,
              }}
            />

            <Ring progress={progress} color={meta.ring} glow={meta.glow} />

            {/* center */}
            <div className="flex flex-col items-center gap-1.5 z-10">
              <span className={`text-[80px] font-mono font-black leading-none tracking-tighter ${meta.textClass}`}
                style={{ textShadow: `0 0 48px ${meta.ring}55` }}>
                {fmtTime(secs)}
              </span>
              <span className="text-white/45 text-sm font-medium">{meta.label}</span>

              {/* active task pill */}
              {activeTask && activeTask.status !== "Done" && (
                <div className="mt-2 flex items-center gap-2 rounded-full px-4 py-1.5 border max-w-56"
                  style={{ background: `${meta.ring}14`, borderColor: `${meta.ring}33` }}>
                  <span className="h-1.5 w-1.5 rounded-full shrink-0 animate-pulse" style={{ background: meta.ring }} />
                  <span className="text-xs text-white/55 truncate">
                    {activeTask.title}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* controls */}
          <div className="flex items-center gap-5">
            <button onClick={reset}
              className="h-12 w-12 rounded-full flex items-center justify-center text-white/45 hover:text-white hover:bg-white/10 border border-white/10 transition-all active:scale-95">
              <RotateCcw className="h-5 w-5" />
            </button>

            <button onClick={() => setRunning(r => !r)}
              className="h-[72px] w-[72px] rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{
                background: `linear-gradient(140deg, ${meta.ring}, ${meta.glow})`,
                boxShadow: `0 0 0 8px ${meta.ring}18, 0 0 36px ${meta.glow}55, 0 6px 24px rgba(0,0,0,0.5)`,
              }}>
              {running
                ? <Pause className="h-7 w-7 text-white" />
                : <Play  className="h-7 w-7 text-white ml-1" />}
            </button>

            <button onClick={skip}
              className="h-12 w-12 rounded-full flex items-center justify-center text-white/45 hover:text-white hover:bg-white/10 border border-white/10 transition-all active:scale-95">
              <SkipForward className="h-5 w-5" />
            </button>
          </div>

          <p className="text-[10px] text-white/18 tracking-[0.25em] uppercase">
            Space · {running ? "pause" : "start"}
          </p>
        </div>

        {/* bottom: ambient + stats */}
        <div className="px-6 pb-5 flex items-end justify-between">
          {/* ambient */}
          <div>
            <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">Ambient</p>
            <div className="flex gap-1.5">
              {AMBIENT.map(a => (
                <button key={a.id} title={a.label}
                  onClick={() => setAmbient(s => s === a.id ? null : a.id)}
                  className="h-9 w-9 rounded-xl flex items-center justify-center transition-all"
                  style={{
                    background: ambient === a.id ? `${meta.ring}28` : "rgba(255,255,255,0.05)",
                    border: `1px solid ${ambient === a.id ? meta.ring + "55" : "rgba(255,255,255,0.08)"}`,
                    color: ambient === a.id ? meta.ring : "rgba(255,255,255,0.35)",
                  }}>
                  <a.icon className="h-4 w-4" />
                </button>
              ))}
              <button onClick={() => setMuted(m => !m)}
                className="h-9 w-9 rounded-xl flex items-center justify-center transition-all text-white/30 hover:text-white/60"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* session stats */}
          <div className="flex items-center gap-6">
            {[
              { label: "Sessions",   value: focusDone },
              { label: "Focus time", value: `${focusMins}m` },
              { label: "Tasks done", value: tasksDone },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className={`text-xl font-bold ${meta.textClass}`}>{value}</p>
                <p className="text-[11px] text-white/28 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Tasks panel ───────────────────────────── */}
      <div className="w-[272px] shrink-0 flex flex-col"
        style={{ borderLeft: "1px solid rgba(255,255,255,0.07)", background: "rgba(5,4,18,0.55)", backdropFilter: "blur(20px)" }}>

        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="font-semibold text-sm text-white">Session Tasks</p>
          <p className="text-[11px] text-white/35 mt-0.5">Click to focus · check to complete</p>
        </div>

        <div className="flex-1 overflow-auto p-3 flex flex-col gap-1">
          {tasks.map(t => {
            const isDone = t.status === "Done"
            const isActive = activeTaskId === t.id && !isDone
            return (
              <div key={t.id}
                onClick={() => !isDone && setActiveTaskId(t.id)}
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all group"
                style={{
                  background: isActive ? `${meta.ring}18` : "transparent",
                  border: `1px solid ${isActive ? meta.ring + "35" : "transparent"}`,
                }}>
                <button className="mt-0.5 shrink-0" onClick={e => { e.stopPropagation(); toggleTask(t.id) }}>
                  {isDone
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    : <Circle className="h-4 w-4 transition-colors"
                        style={{ color: isActive ? meta.ring + "cc" : "rgba(255,255,255,0.2)" }} />}
                </button>
                <span className={`text-sm leading-snug flex-1 ${isDone ? "line-through text-white/22" : isActive ? "text-white" : "text-white/50"}`}>
                  {t.title}
                </span>
                {isActive && (
                  <span className="text-[9px] font-bold uppercase tracking-wider shrink-0 px-1.5 py-0.5 rounded-full leading-tight"
                    style={{ background: meta.ring + "30", color: meta.ring }}>
                    ON
                  </span>
                )}
              </div>
            )
          })}

          {tasks.length > 0 && tasks.every(t => t.status === "Done") && (
            <div className="text-center py-8">
              <p className="text-2xl mb-1">🎉</p>
              <p className="text-xs text-white/35">All tasks done!</p>
            </div>
          )}

          {tasks.length === 0 && (
            <div className="text-center py-8">
              <p className="text-xs text-white/35">No tasks yet. Add one below!</p>
            </div>
          )}
        </div>

        {/* add task input */}
        <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
              placeholder="Add task..."
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddTask()}
            />
            <button onClick={handleAddTask}
              className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all hover:opacity-85 active:scale-95"
              style={{ background: meta.ring }}>
              <Plus className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* session history */}
        {sessions.length > 0 && (
          <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-[10px] text-white/28 uppercase tracking-widest mb-2">History</p>
            <div className="flex flex-col gap-1.5 max-h-28 overflow-auto">
              {[...sessions].reverse().map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-white/35">
                  <span className="flex items-center gap-1.5">
                    {s.phase === "focus" ? <Brain className="h-3 w-3" /> : <Coffee className="h-3 w-3" />}
                    {s.phase === "focus" ? "Focus" : s.phase === "short-break" ? "Short break" : "Long break"}
                  </span>
                  <span className="text-white/25">{format(s.at, "h:mm aa")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

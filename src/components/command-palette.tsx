"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  LayoutDashboard, CheckSquare, Calendar, MonitorPlay,
  FileText, Briefcase, Activity, Timer, Book, FolderOpen,
  Bookmark, Target, DollarSign, BarChart, Settings, Plus,
  Search, Zap
} from "lucide-react"

const NAV_COMMANDS = [
  { label: "Dashboard",  href: "/",          icon: LayoutDashboard },
  { label: "Tasks",      href: "/tasks",      icon: CheckSquare },
  { label: "Calendar",   href: "/calendar",   icon: Calendar },
  { label: "Whiteboard", href: "/whiteboard", icon: MonitorPlay },
  { label: "Notes",      href: "/notes",      icon: FileText },
  { label: "Projects",   href: "/projects",   icon: Briefcase },
  { label: "Habits",     href: "/habits",     icon: Activity },
  { label: "Focus",      href: "/focus",      icon: Timer },
  { label: "Journal",    href: "/journal",    icon: Book },
  { label: "Files",      href: "/files",      icon: FolderOpen },
  { label: "Bookmarks",  href: "/bookmarks",  icon: Bookmark },
  { label: "Goals",      href: "/goals",      icon: Target },
  { label: "Finance",    href: "/finance",    icon: DollarSign },
  { label: "Analytics",  href: "/analytics",  icon: BarChart },
  { label: "Settings",   href: "/settings",   icon: Settings },
]

const ACTION_COMMANDS = [
  { label: "New Task",    icon: Plus,   action: "new-task"    },
  { label: "New Note",    icon: Plus,   action: "new-note"    },
  { label: "New Event",   icon: Plus,   action: "new-event"   },
  { label: "New Project", icon: Plus,   action: "new-project" },
  { label: "Start Focus", icon: Zap,    action: "start-focus" },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const navigate = (href: string) => {
    router.push(href)
    setOpen(false)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Actions">
          {ACTION_COMMANDS.map(cmd => (
            <CommandItem
              key={cmd.action}
              onSelect={() => {
                // navigate to relevant page for now
                if (cmd.action === "new-task")    navigate("/tasks")
                if (cmd.action === "new-note")    navigate("/notes")
                if (cmd.action === "new-event")   navigate("/calendar")
                if (cmd.action === "new-project") navigate("/projects")
                if (cmd.action === "start-focus") navigate("/focus")
              }}
              className="gap-2"
            >
              <cmd.icon className="h-4 w-4" />
              {cmd.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          {NAV_COMMANDS.map(cmd => (
            <CommandItem
              key={cmd.href}
              onSelect={() => navigate(cmd.href)}
              className="gap-2"
            >
              <cmd.icon className="h-4 w-4" />
              {cmd.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

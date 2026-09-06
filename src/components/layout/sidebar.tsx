"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  MonitorPlay, // Alternative for whiteboard
  FileText,
  Briefcase,
  Activity,
  Timer,
  Book,
  FolderOpen,
  Bookmark,
  Target,
  DollarSign,
  BarChart,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useUserStore } from "@/lib/stores/use-user-store"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Whiteboard", href: "/whiteboard", icon: MonitorPlay },
  { name: "Notes", href: "/notes", icon: FileText },
  { name: "Projects", href: "/projects", icon: Briefcase },
  { name: "Habits", href: "/habits", icon: Activity },
  { name: "Focus", href: "/focus", icon: Timer },
  { name: "Journal", href: "/journal", icon: Book },
  { name: "Files", href: "/files", icon: FolderOpen },
  { name: "Bookmarks", href: "/bookmarks", icon: Bookmark },
  { name: "Goals", href: "/goals", icon: Target },
  { name: "Finance", href: "/finance", icon: DollarSign },
  { name: "Analytics", href: "/analytics", icon: BarChart },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { user } = useUserStore()

  return (
    <div
      className={cn(
        "flex flex-col border-r bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-14 items-center justify-between px-4 py-4 border-b">
        {!collapsed && <span className="font-bold text-lg truncate">Personal OS</span>}
        <Button
          variant="ghost"
          size="icon"
          className={cn("ml-auto", collapsed && "mx-auto ml-0")}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="grid gap-1 px-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>
      </div>
      
      {!collapsed && (
        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold uppercase">
              {user.name ? user.name.trim()[0] : "S"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">{user.name || "User"}</span>
              <span className="text-xs text-muted-foreground">{user.plan || "Pro Plan"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

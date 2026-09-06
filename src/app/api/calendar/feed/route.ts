import { NextResponse } from "next/server"
import { getTursoCollection } from "@/lib/turso"
import type { CalendarEvent } from "@/lib/types/drive"

function formatIcsDate(dateStr: string, timeStr?: string): string {
  // If no time is provided, return all-day format YYYYMMDD
  if (!timeStr) {
    return dateStr.replace(/-/g, "")
  }
  // If time is provided, return YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS
  const [hours, minutes] = timeStr.split(":")
  const cleanDate = dateStr.replace(/-/g, "")
  return `${cleanDate}T${hours.padStart(2, "0")}${minutes.padStart(2, "0")}00`
}

export async function GET(req: Request) {
  try {
    const result = await getTursoCollection("events")
    const events = (result.items || []) as (CalendarEvent & {
      date?: string
      startTime?: string
      endTime?: string
      isAllDay?: boolean
      location?: string
    })[]

    const icsLines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Personal OS//Google Calendar Sync//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Personal OS Events",
      "X-WR-TIMEZONE:Asia/Kolkata",
    ]

    const nowStr = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")

    for (const ev of events) {
      if (!ev.title) continue

      const uid = ev.id || `evt_${Math.random().toString(36).slice(2, 9)}`
      const eventDate = ev.date || (ev.start ? ev.start.split("T")[0] : new Date().toISOString().split("T")[0])
      
      let startTime = ev.startTime
      let endTime = ev.endTime
      if (!startTime && ev.start && ev.start.includes("T")) {
        startTime = ev.start.split("T")[1].slice(0, 5)
      }
      if (!endTime && ev.end && ev.end.includes("T")) {
        endTime = ev.end.split("T")[1].slice(0, 5)
      }

      const isAllDay = ev.isAllDay || (!startTime && !endTime)
      const dtStart = formatIcsDate(eventDate, isAllDay ? undefined : startTime)
      const dtEnd = formatIcsDate(eventDate, isAllDay ? undefined : (endTime || startTime))

      icsLines.push("BEGIN:VEVENT")
      icsLines.push(`UID:${uid}@personal-os.local`)
      icsLines.push(`DTSTAMP:${nowStr}`)
      if (isAllDay) {
        icsLines.push(`DTSTART;VALUE=DATE:${dtStart}`)
      } else {
        icsLines.push(`DTSTART:${dtStart}`)
        icsLines.push(`DTEND:${dtEnd}`)
      }
      icsLines.push(`SUMMARY:${ev.title.replace(/\n/g, " ")}`)
      if (ev.description) {
        icsLines.push(`DESCRIPTION:${ev.description.replace(/\n/g, "\\n")}`)
      }
      if (ev.location) {
        icsLines.push(`LOCATION:${ev.location.replace(/\n/g, " ")}`)
      }
      icsLines.push("STATUS:CONFIRMED")
      icsLines.push("END:VEVENT")
    }

    icsLines.push("END:VCALENDAR")
    const icsContent = icsLines.join("\r\n")

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="personal-os-calendar.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to generate iCal feed"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

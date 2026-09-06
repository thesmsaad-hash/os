import { NextResponse } from "next/server"
import { getTursoCollection, saveTursoCollection } from "@/lib/turso"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const gasUrl =
      req.headers.get("x-gas-api-url") ||
      process.env.NEXT_PUBLIC_GAS_URL ||
      process.env.GAS_API_URL ||
      "https://script.google.com/macros/s/AKfycbwy5wrWXudIwy8kCaDnL-XkG4cu1WwqC4uH7wETUs8cfKko_T9xyBu-QYtN3vmpaf7cIQ/exec"
    const gasKey =
      req.headers.get("x-gas-api-key") ||
      process.env.GAS_API_KEY ||
      "personal_os_secret_key_2026"

    const localResult = await getTursoCollection("events")
    const localEvents = localResult.items || []

    if (!gasUrl) {
      return NextResponse.json({
        success: true,
        configured: false,
        message: "Google Apps Script URL not configured. Use .ics feed or configure in Settings.",
        events: localEvents,
        count: localEvents.length,
      })
    }

    // Query GAS for Google Calendar events
    const res = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "getGoogleCalendarEvents",
        apiKey: gasKey,
        startDate,
        endDate,
      }),
    })

    if (!res.ok) {
      return NextResponse.json({
        success: false,
        error: `Google Apps Script returned status ${res.status}`,
      }, { status: 502 })
    }

    const json = await res.json()
    return NextResponse.json({
      success: true,
      configured: true,
      googleCalendar: json,
      localEventsCount: localEvents.length,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch Google Calendar events"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const gasUrl =
      req.headers.get("x-gas-api-url") ||
      body.gasUrl ||
      process.env.NEXT_PUBLIC_GAS_URL ||
      process.env.GAS_API_URL ||
      "https://script.google.com/macros/s/AKfycbwy5wrWXudIwy8kCaDnL-XkG4cu1WwqC4uH7wETUs8cfKko_T9xyBu-QYtN3vmpaf7cIQ/exec"
    const gasKey =
      req.headers.get("x-gas-api-key") ||
      body.gasKey ||
      process.env.GAS_API_KEY ||
      "personal_os_secret_key_2026"

    // 1. Get current Turso events
    const localResult = await getTursoCollection("events")
    const currentEvents = (localResult.items || []) as any[]

    if (!gasUrl) {
      return NextResponse.json({
        success: false,
        configured: false,
        error: "Google Apps Script Web App URL is required to sync with Google Calendar.",
      }, { status: 400 })
    }

    // 2. Trigger sync on GAS
    const res = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "syncGoogleCalendar",
        apiKey: gasKey,
        events: currentEvents,
        startDate: body.startDate,
        endDate: body.endDate,
      }),
    })

    if (!res.ok) {
      return NextResponse.json({
        success: false,
        error: `Google Apps Script returned HTTP ${res.status}`,
      }, { status: 502 })
    }

    const syncResult = await res.json()
    if (!syncResult.success) {
      return NextResponse.json({
        success: false,
        error: syncResult.error || "Google Calendar sync failed on script side",
      }, { status: 500 })
    }

    // 3. Merge imported events into Turso
    const importedEvents = syncResult.importedEvents || []
    const existingIds = new Set(currentEvents.map(e => e.googleEventId || e.id))
    const merged = [...currentEvents]

    for (const gEvent of importedEvents) {
      if (!existingIds.has(gEvent.googleEventId) && !existingIds.has(gEvent.id)) {
        merged.push(gEvent)
        existingIds.add(gEvent.googleEventId)
      }
    }

    // 4. Save merged events directly to Turso Edge Database
    await saveTursoCollection("events", merged)

    return NextResponse.json({
      success: true,
      configured: true,
      importedCount: importedEvents.length,
      exportedCount: syncResult.exportedCount || 0,
      totalEvents: merged.length,
      timeZone: syncResult.timeZone || "Asia/Kolkata",
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Sync error"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

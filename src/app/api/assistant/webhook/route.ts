import { NextResponse } from "next/server"
import { getTursoCollection, upsertTursoItem } from "@/lib/turso"
import { sendNtfyNotification } from "@/lib/ntfy"

function parseTaskFromVoice(queryText: string) {
  let text = queryText.trim()
  
  // Remove wake words and voice prefixes
  text = text.replace(/^(hey google|ok google|assistant|personal os)[,:\s]*/i, "").trim()
  text = text.replace(/^(please\s+)?(could you\s+|can you\s+)?(add|create|make|schedule|put|remind me to)?\s*(a |an )?\s*(task|todo|to-do|reminder)?\s*(to |for |that )?/i, "").trim()
  text = text.replace(/^[,.\s-]+/, "").trim()
  if (!text) text = queryText.trim()

  // Detect priority
  let priority: "Low" | "Medium" | "High" | "Urgent" = "Medium"
  if (/urgent|asap|critical/i.test(text)) {
    priority = "Urgent"
    text = text.replace(/\b(urgent|asap|critical)\b/gi, "").trim()
  } else if (/high priority|priority high|important/i.test(text)) {
    priority = "High"
    text = text.replace(/\b(high priority|priority high|important)\b/gi, "").trim()
  } else if (/low priority|priority low/i.test(text)) {
    priority = "Low"
    text = text.replace(/\b(low priority|priority low)\b/gi, "").trim()
  }

  // Detect due date
  const now = new Date()
  let dueDate = now.toISOString().split("T")[0]
  if (/tomorrow/i.test(text)) {
    const tom = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    dueDate = tom.toISOString().split("T")[0]
    text = text.replace(/\btomorrow\b/gi, "").trim()
  } else if (/today/i.test(text)) {
    dueDate = now.toISOString().split("T")[0]
    text = text.replace(/\btoday\b/gi, "").trim()
  }

  // Clean trailing prepositions or punctuation
  text = text.replace(/\s+(on|for|at|due|by)$/i, "").replace(/[.,!?;]+$/, "").trim()
  if (!text) text = "Voice task"

  // Capitalize first letter
  const title = text.charAt(0).toUpperCase() + text.slice(1)

  return { title, priority, dueDate }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Personal OS Google Assistant Voice Webhook",
    version: "1.0.0",
    description: "Accepts voice commands from Google Assistant Routines, IFTTT, and shortcuts",
    supportedActions: [
      "Add task <title> [tomorrow|today] [priority high|urgent]",
      "Schedule <event> [at time] [tomorrow|today]",
      "What are my tasks for today?",
    ],
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))

    // Support multiple voice payload formats:
    // 1. Google Assistant / Dialogflow: body.queryResult.queryText
    // 2. IFTTT / Shortcuts: body.query, body.text, or body.command
    const rawQuery: string =
      body.queryResult?.queryText ||
      body.query ||
      body.text ||
      body.command ||
      body.message ||
      ""

    const action = (body.action || "").toLowerCase()

    if (!rawQuery && !body.title) {
      return NextResponse.json({
        success: false,
        error: "Missing voice query. Provide 'query', 'text', or 'command' in request body.",
        speech: "I didn't catch that. What would you like to add to Personal OS?",
      }, { status: 400 })
    }

    const lowerQuery = rawQuery.toLowerCase()

    // ── Intent 1: Query tasks for today ─────────────────────────────────────────
    if (lowerQuery.includes("what are my tasks") || lowerQuery.includes("list my tasks") || lowerQuery.includes("show my tasks")) {
      const result = await getTursoCollection("tasks")
      const tasks = (result.items || []) as any[]
      const today = new Date().toISOString().split("T")[0]
      const pendingTasks = tasks.filter(t => t.status !== "Done" && (t.dueDate === today || !t.dueDate))

      let speech: string
      if (pendingTasks.length === 0) {
        speech = "You have no pending tasks scheduled for today in Personal OS. Great job!"
      } else {
        const titles = pendingTasks.slice(0, 4).map(t => t.title).join(", ")
        speech = `You have ${pendingTasks.length} pending task${pendingTasks.length > 1 ? "s" : ""} today: ${titles}.`
      }

      return NextResponse.json({
        success: true,
        intent: "query_tasks",
        speech,
        fulfillmentText: speech,
        count: pendingTasks.length,
        tasks: pendingTasks,
      })
    }

    // ── Intent 2: Schedule an event ─────────────────────────────────────────────
    if (action === "create_event" || lowerQuery.includes("schedule") || lowerQuery.startsWith("event") || lowerQuery.includes("meeting with") || lowerQuery.includes("appointment")) {
      const id = `evt_voice_${Date.now()}`
      let cleanQuery = rawQuery.replace(/^(hey google|ok google|assistant|personal os)[,:\s]*/i, "")
      let title = body.title || cleanQuery.replace(/^(schedule|event|add event|calendar)\s*(a |an )?/i, "").trim()

      // Parse time if mentioned (e.g. "at 10am", "at 2:30pm", "at 14:00")
      let startTime = body.startTime || "10:00"
      let endTime = body.endTime || "11:00"
      const timeMatch = lowerQuery.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i)
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10)
        const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0
        const ampm = timeMatch[3]?.toLowerCase()
        if (ampm === "pm" && hours < 12) hours += 12
        if (ampm === "am" && hours === 12) hours = 0
        startTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
        const endHours = (hours + 1) % 24
        endTime = `${String(endHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
        // Remove the "at time" from title
        title = title.replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/gi, "").trim()
      }

      // Remove date words from title
      title = title.replace(/\b(tomorrow|today)\b/gi, "").replace(/\s+(on|at|for)$/i, "").replace(/[.,!?;]+$/, "").trim()
      if (!title) title = "Meeting"
      title = title.charAt(0).toUpperCase() + title.slice(1)

      const todayStr = new Date().toISOString().split("T")[0]
      const eventDate = body.date || (lowerQuery.includes("tomorrow") ? new Date(Date.now() + 86400000).toISOString().split("T")[0] : todayStr)

      const newEvent = {
        id,
        title,
        date: eventDate,
        startTime,
        endTime,
        category: "work",
        color: "#8b5cf6",
        source: "google_assistant",
        createdAt: new Date().toISOString(),
      }

      await upsertTursoItem("events", newEvent)

      const speech = `Scheduled event "${newEvent.title}" in Personal OS for ${newEvent.date}.`

      // Dispatch push notification to phone
      sendNtfyNotification({
        title: "🎙️ Google Assistant Event",
        message: speech,
        priority: 3,
        tags: ["calendar", "microphone"],
      }).catch(() => {})

      return NextResponse.json({
        success: true,
        intent: "create_event",
        speech,
        fulfillmentText: speech,
        event: newEvent,
      })
    }

    // ── Intent 3: Add Task (Default) ────────────────────────────────────────────
    const parsed = parseTaskFromVoice(rawQuery)
    const taskTitle = body.title || parsed.title
    const taskPriority = body.priority || parsed.priority
    const taskDueDate = body.dueDate || parsed.dueDate

    const newTask = {
      id: `task_voice_${Date.now()}`,
      title: taskTitle,
      priority: taskPriority,
      status: "Todo",
      tags: ["voice", "assistant"],
      dueDate: taskDueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: "google_assistant",
    }

    await upsertTursoItem("tasks", newTask)

    const speech = `Added task "${newTask.title}" to Personal OS with ${newTask.priority} priority.`

    // Send push notification to user's phone via ntfy
    sendNtfyNotification({
      title: "🎙️ Google Assistant Task Added",
      message: `${newTask.title} (Due: ${newTask.dueDate})`,
      priority: 4,
      tags: ["white_check_mark", "microphone"],
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      intent: "create_task",
      speech,
      fulfillmentText: speech,
      task: newTask,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Assistant webhook error"
    return NextResponse.json({
      success: false,
      error: msg,
      speech: "Sorry, I ran into an issue saving that to Personal OS.",
    }, { status: 500 })
  }
}

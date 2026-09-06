import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      server = "https://ntfy.sh",
      topic,
      title,
      message,
      priority = 3,
      tags = [],
      click,
      actions,
      token,
    } = body

    const targetTopic = topic || process.env.NTFY_TOPIC || "personal-os-saad"
    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      )
    }

    const cleanServer = server.replace(/\/+$/, "")
    const targetUrl = `${cleanServer}/${encodeURIComponent(targetTopic)}`

    const headers: Record<string, string> = {}
    if (title) headers["Title"] = title
    if (priority) headers["Priority"] = String(priority)
    if (tags && tags.length > 0) headers["Tags"] = Array.isArray(tags) ? tags.join(",") : String(tags)
    if (click) headers["Click"] = click
    if (actions) headers["Actions"] = typeof actions === "string" ? actions : JSON.stringify(actions)
    
    const authToken = token || process.env.NTFY_TOKEN
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`

    const response = await fetch(targetUrl, {
      method: "POST",
      body: message,
      headers,
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => "")
      return NextResponse.json(
        { error: `ntfy upstream returned ${response.status}: ${errText}` },
        { status: response.status }
      )
    }

    const resJson = await response.json().catch(() => ({ ok: true }))
    return NextResponse.json({ success: true, upstream: resJson })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Internal error"
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

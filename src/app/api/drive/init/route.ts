import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const customUrl = req.headers.get("x-gas-api-url")
    const customKey = req.headers.get("x-gas-api-key")

    const url = (customUrl || process.env.GAS_API_URL || process.env.NEXT_PUBLIC_GAS_API_URL || "").trim()
    const key = (customKey || process.env.GAS_API_KEY || "personal_os_secret_key_2026").trim()

    if (!url) {
      return NextResponse.json(
        { success: false, error: "GAS_API_URL is not configured" },
        { status: 400 }
      )
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      redirect: "follow",
      body: JSON.stringify({
        action: "init",
        apiKey: key,
      }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      return NextResponse.json(
        { success: false, error: `GAS init failed (${response.status}): ${text}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Initialization failed"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

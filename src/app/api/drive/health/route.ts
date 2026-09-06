import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const customUrl = req.headers.get("x-gas-api-url")
  const url = (customUrl || process.env.GAS_API_URL || process.env.NEXT_PUBLIC_GAS_API_URL || "").trim()

  if (!url) {
    return NextResponse.json({
      connected: false,
      configured: false,
      message: "GAS_API_URL is not set",
    })
  }

  const startTime = Date.now()
  try {
    const targetUrl = new URL(url)
    targetUrl.searchParams.set("action", "health")

    const res = await fetch(targetUrl.toString(), {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
    })

    const latencyMs = Date.now() - startTime
    if (!res.ok) {
      return NextResponse.json({
        connected: false,
        configured: true,
        status: res.status,
        latencyMs,
        error: `GAS responded with status ${res.status}`,
      })
    }

    const data = await res.json().catch(() => ({}))
    return NextResponse.json({
      connected: true,
      configured: true,
      latencyMs,
      upstream: data,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Connection failed"
    return NextResponse.json({
      connected: false,
      configured: true,
      latencyMs: Date.now() - startTime,
      error: message,
    })
  }
}

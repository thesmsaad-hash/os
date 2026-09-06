import { NextResponse } from "next/server"
import {
  getTursoCollection,
  saveTursoCollection,
  upsertTursoItem,
  deleteTursoItem,
} from "@/lib/turso"

function getGasConfig(req?: Request) {
  const customUrl = req?.headers.get("x-gas-api-url")
  const customKey = req?.headers.get("x-gas-api-key")

  const url = (customUrl || process.env.GAS_API_URL || process.env.NEXT_PUBLIC_GAS_API_URL || "").trim()
  const key = (customKey || process.env.GAS_API_KEY || "personal_os_secret_key_2026").trim()

  return { url, key }
}

const hasTurso = Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN)

export async function GET(
  req: Request,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection } = await params

    // 1. Try Turso first if configured (ultra-fast edge latency ~10-25ms)
    if (hasTurso) {
      try {
        const tursoResult = await getTursoCollection(collection)
        if (tursoResult.items.length > 0) {
          return NextResponse.json({
            success: true,
            data: {
              collection,
              version: tursoResult.version,
              items: tursoResult.items,
              provider: "turso",
            },
          })
        }
      } catch (tursoErr) {
        console.warn(`Turso GET fallback for ${collection}:`, tursoErr)
      }
    }

    // 2. Fetch from Google Drive (or fallback)
    const { url, key } = getGasConfig(req)
    if (!url) {
      return NextResponse.json(
        { success: false, error: "No backend URL configured", offline: true },
        { status: 503 }
      )
    }

    const targetUrl = new URL(url)
    targetUrl.searchParams.set("action", "readCollection")
    targetUrl.searchParams.set("collection", collection)
    targetUrl.searchParams.set("apiKey", key)

    const response = await fetch(targetUrl.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "follow",
      cache: "no-store",
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      return NextResponse.json(
        { success: false, error: `Google Apps Script returned ${response.status}: ${text}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    // If Google Drive has data and Turso was empty, seed Turso asynchronously for future fast reads
    if (hasTurso && data.success && data.data && Array.isArray(data.data.items) && data.data.items.length > 0) {
      saveTursoCollection(collection, data.data.items).catch((err) =>
        console.warn(`Failed to seed Turso cache for ${collection}:`, err)
      )
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Internal proxy error"
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection } = await params
    const body = await req.json().catch(() => ({}))
    const { action = "writeCollection", items, item, operation, metadata } = body

    let tursoSuccess = false
    let currentVersion = 1

    // 1. Write to Turso Edge Database immediately
    if (hasTurso) {
      try {
        if (action === "updateItem" && item?.id) {
          const res = await upsertTursoItem(collection, item)
          tursoSuccess = true
          currentVersion = res.version
        } else if (action === "deleteItem" && item?.id) {
          const res = await deleteTursoItem(collection, item.id)
          tursoSuccess = true
          currentVersion = res.version
        } else if (Array.isArray(items)) {
          const res = await saveTursoCollection(collection, items)
          tursoSuccess = true
          currentVersion = res.version
        }
      } catch (tursoErr) {
        console.warn(`Turso POST error for ${collection}:`, tursoErr)
      }
    }

    // 2. Background / asynchronous replication to Google Drive for redundancy
    const { url, key } = getGasConfig(req)
    if (url) {
      const payload = {
        action,
        collection,
        apiKey: key,
        items,
        item,
        operation,
        metadata,
      }

      // If Turso succeeded, dispatch to GAS in background without blocking response
      if (tursoSuccess) {
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          redirect: "follow",
          body: JSON.stringify(payload),
        }).catch((err) => console.warn(`GAS background sync error for ${collection}:`, err))

        return NextResponse.json({
          success: true,
          data: {
            collection,
            version: currentVersion,
            provider: "turso+drive_sync",
          },
        })
      }

      // If Turso was not available, wait for GAS synchronously
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        redirect: "follow",
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        return NextResponse.json(
          { success: false, error: `Google Apps Script returned ${response.status}: ${text}` },
          { status: response.status }
        )
      }

      const data = await response.json()
      return NextResponse.json(data)
    }

    if (tursoSuccess) {
      return NextResponse.json({
        success: true,
        data: {
          collection,
          version: currentVersion,
          provider: "turso",
        },
      })
    }

    return NextResponse.json(
      { success: false, error: "Neither Turso nor Google Drive backend is available" },
      { status: 503 }
    )
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Internal proxy error"
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 })
  }
}

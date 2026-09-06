import { NextResponse } from "next/server"
import {
  getTursoCollection,
  saveTursoCollection,
  upsertTursoItem,
  deleteTursoItem,
} from "@/lib/turso"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection } = await params
    const result = await getTursoCollection(collection)

    return NextResponse.json({
      success: true,
      collection,
      version: result.version,
      items: result.items,
      data: {
        items: result.items,
        version: result.version,
      },
      provider: "turso",
    })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Turso fetch error"
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
    const { action = "writeCollection", items, item } = body

    if (action === "updateItem" && item?.id) {
      const res = await upsertTursoItem(collection, item)
      return NextResponse.json({
        success: true,
        collection,
        version: res.version,
        provider: "turso",
      })
    }

    if (action === "deleteItem" && item?.id) {
      const res = await deleteTursoItem(collection, item.id)
      return NextResponse.json({
        success: true,
        collection,
        version: res.version,
        provider: "turso",
      })
    }

    // Default: write entire collection
    if (Array.isArray(items)) {
      const res = await saveTursoCollection(collection, items)
      return NextResponse.json({
        success: true,
        collection,
        version: res.version,
        count: res.count,
        provider: "turso",
      })
    }

    return NextResponse.json(
      { success: false, error: "Invalid payload: missing items or item" },
      { status: 400 }
    )
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Turso write error"
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 })
  }
}

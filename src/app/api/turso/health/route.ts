import { NextResponse } from "next/server"
import { getTursoClient, initTursoSchema } from "@/lib/turso"

export async function GET() {
  const start = Date.now()

  try {
    const db = getTursoClient()
    await initTursoSchema()

    const rs = await db.execute("SELECT 1 as connected, datetime('now') as server_time, sqlite_version() as sqlite_version")
    const duration = Date.now() - start

    const countRs = await db.execute("SELECT collection, count(*) as count FROM collections GROUP BY collection")
    const collectionsCount: Record<string, number> = {}
    for (const row of countRs.rows) {
      collectionsCount[row.collection as string] = Number(row.count)
    }

    return NextResponse.json({
      success: true,
      connected: true,
      configured: true,
      status: "connected",
      provider: "Turso (LibSQL Edge)",
      latencyMs: duration,
      info: {
        serverTime: rs.rows[0].server_time,
        sqliteVersion: rs.rows[0].sqlite_version,
        collections: collectionsCount,
      },
    })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to connect to Turso"
    return NextResponse.json(
      {
        success: false,
        status: "error",
        provider: "Turso (LibSQL Edge)",
        error: errMsg,
      },
      { status: 500 }
    )
  }
}

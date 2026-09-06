import { createClient, type Client } from "@libsql/client"

let clientInstance: Client | null = null

export function getTursoClient(): Client {
  if (clientInstance) return clientInstance

  const url =
    process.env.TURSO_DATABASE_URL ||
    "libsql://personal-os-saad19.aws-ap-south-1.turso.io"
  const authToken =
    process.env.TURSO_AUTH_TOKEN ||
    "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODg2ODAxNzIsImlkIjoiMDFhMDc1YTQtMTQwMS03NjAyLTkwZTUtNDQ1NTA1MjcyOWY1Iiwia2lkIjoiVmREcE94eFRlSUR0TWZXTFNzdGd0WHNXQzY4eDhpeWhpaERETkVmaXZNQSIsInJpZCI6ImIyYjA1ZDZhLWZhOGQtNDkwZS04MTc4LWQ4YjQ0NmUzZjk5OCJ9.SKwN4qQQtPup6dAyzzdzhAIhjTHoNVMXwh9AhWdugQ2CyX2078nYLSgPAu1RfVd-xcRpq8o1Mr_4gYAMBDGMDg"

  if (!url || !authToken) {
    throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in environment")
  }

  clientInstance = createClient({
    url,
    authToken,
  })

  return clientInstance
}

/**
 * Initializes Turso schema if not already created
 */
export async function initTursoSchema() {
  const db = getTursoClient()

  await db.batch([
    `CREATE TABLE IF NOT EXISTS collections (
      collection TEXT NOT NULL,
      id TEXT NOT NULL,
      data TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (collection, id)
    );`,
    `CREATE INDEX IF NOT EXISTS idx_collections_col ON collections(collection);`,
    `CREATE INDEX IF NOT EXISTS idx_collections_updated ON collections(collection, updated_at);`,
    `CREATE TABLE IF NOT EXISTS sync_meta (
      collection TEXT PRIMARY KEY,
      version INTEGER DEFAULT 1,
      last_sync TEXT DEFAULT (datetime('now'))
    );`,
  ])
}

/**
 * Fetch all items in a collection from Turso
 */
export async function getTursoCollection<T>(collection: string): Promise<{ items: T[]; version: number }> {
  const db = getTursoClient()
  await initTursoSchema()

  const [metaRs, itemsRs] = await Promise.all([
    db.execute({
      sql: "SELECT version FROM sync_meta WHERE collection = ?",
      args: [collection],
    }),
    db.execute({
      sql: "SELECT data FROM collections WHERE collection = ? ORDER BY rowid ASC",
      args: [collection],
    }),
  ])

  const version = metaRs.rows.length > 0 ? Number(metaRs.rows[0].version) : 1
  const items: T[] = itemsRs.rows.map((row) => JSON.parse(row.data as string))

  return { items, version }
}

/**
 * Save an entire collection to Turso
 */
export async function saveTursoCollection<T extends { id: string }>(
  collection: string,
  items: T[]
): Promise<{ success: boolean; version: number; count: number }> {
  const db = getTursoClient()
  await initTursoSchema()

  const metaRs = await db.execute({
    sql: "SELECT version FROM sync_meta WHERE collection = ?",
    args: [collection],
  })

  const newVersion = (metaRs.rows.length > 0 ? Number(metaRs.rows[0].version) : 0) + 1
  const now = new Date().toISOString()

  // Execute in transaction
  const tx = await db.transaction("write")
  try {
    // Delete existing records for this collection
    await tx.execute({
      sql: "DELETE FROM collections WHERE collection = ?",
      args: [collection],
    })

    // Batch insert all items
    for (const item of items) {
      await tx.execute({
        sql: `INSERT INTO collections (collection, id, data, version, updated_at) VALUES (?, ?, ?, ?, ?)`,
        args: [collection, item.id, JSON.stringify(item), newVersion, now],
      })
    }

    // Update metadata
    await tx.execute({
      sql: `INSERT INTO sync_meta (collection, version, last_sync) VALUES (?, ?, ?)
            ON CONFLICT(collection) DO UPDATE SET version = excluded.version, last_sync = excluded.last_sync`,
      args: [collection, newVersion, now],
    })

    await tx.commit()
    return { success: true, version: newVersion, count: items.length }
  } catch (error) {
    await tx.rollback()
    throw error
  }
}

/**
 * Upsert a single item in Turso
 */
export async function upsertTursoItem<T extends { id: string }>(
  collection: string,
  item: T
): Promise<{ success: boolean; version: number }> {
  const db = getTursoClient()
  await initTursoSchema()

  const now = new Date().toISOString()

  const metaRs = await db.execute({
    sql: "SELECT version FROM sync_meta WHERE collection = ?",
    args: [collection],
  })
  const newVersion = (metaRs.rows.length > 0 ? Number(metaRs.rows[0].version) : 0) + 1

  await db.batch([
    {
      sql: `INSERT INTO collections (collection, id, data, version, updated_at) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data, version = version + 1, updated_at = excluded.updated_at`,
      args: [collection, item.id, JSON.stringify(item), newVersion, now],
    },
    {
      sql: `INSERT INTO sync_meta (collection, version, last_sync) VALUES (?, ?, ?)
            ON CONFLICT(collection) DO UPDATE SET version = excluded.version, last_sync = excluded.last_sync`,
      args: [collection, newVersion, now],
    },
  ])

  return { success: true, version: newVersion }
}

/**
 * Delete a single item in Turso
 */
export async function deleteTursoItem(collection: string, id: string): Promise<{ success: boolean; version: number }> {
  const db = getTursoClient()
  await initTursoSchema()

  const metaRs = await db.execute({
    sql: "SELECT version FROM sync_meta WHERE collection = ?",
    args: [collection],
  })
  const newVersion = (metaRs.rows.length > 0 ? Number(metaRs.rows[0].version) : 0) + 1

  await db.batch([
    {
      sql: "DELETE FROM collections WHERE collection = ? AND id = ?",
      args: [collection, id],
    },
    {
      sql: `INSERT INTO sync_meta (collection, version, last_sync) VALUES (?, ?, ?)
            ON CONFLICT(collection) DO UPDATE SET version = excluded.version, last_sync = excluded.last_sync`,
      args: [collection, newVersion, new Date().toISOString()],
    },
  ])

  return { success: true, version: newVersion }
}

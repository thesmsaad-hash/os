"use client"

import type { CollectionEnvelope } from "./types/drive"

const CACHE_PREFIX = "personal_os_cache_"

export interface DriveApiOptions {
  gasUrl?: string
  gasKey?: string
}

function getHeaders(options?: DriveApiOptions): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (options?.gasUrl) headers["x-gas-api-url"] = options.gasUrl
  if (options?.gasKey) headers["x-gas-api-key"] = options.gasKey
  return headers
}

/**
 * Reads local cached collection items
 */
export function getLocalCache<T>(collection: string): T[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${collection}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : parsed.items || null
  } catch {
    return null
  }
}

/**
 * Sets local cached collection items
 */
export function setLocalCache<T>(collection: string, items: T[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(`${CACHE_PREFIX}${collection}`, JSON.stringify(items))
    window.dispatchEvent(new CustomEvent(`collection-updated-${collection}`, { detail: items }))
  } catch {}
}

/**
 * Fetch collection from Google Drive via Next.js API proxy
 * Falls back to local cache or defaults if offline / error
/**
 * Fetch collection directly from Turso LibSQL Edge Backend
 * Falls back to local cache or defaults if offline / error
 */
export async function fetchCollection<T>(
  collection: string,
  defaultItems: T[] = [],
  options?: DriveApiOptions
): Promise<{ items: T[]; version: number; fromCache: boolean; error?: string; provider?: string }> {
  const cached = getLocalCache<T>(collection)

  try {
    // 1. Direct fetch from Turso LibSQL Edge database
    const res = await fetch(`/api/turso/${collection}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })

    if (res.ok) {
      const json = await res.json()
      const rawItems = json.items || json.data?.items
      if (json.success && Array.isArray(rawItems)) {
        const items = rawItems as T[]
        setLocalCache(collection, items)
        return {
          items,
          version: json.version || json.data?.version || 1,
          fromCache: false,
          provider: "turso",
        }
      }
    }

    // 2. Fallback to /api/drive/${collection}
    const fallbackRes = await fetch(`/api/drive/${collection}`, {
      method: "GET",
      headers: getHeaders(options),
      cache: "no-store",
    })

    if (!fallbackRes.ok) {
      return {
        items: cached || defaultItems,
        version: 1,
        fromCache: true,
        error: `Server responded with ${fallbackRes.status}`,
      }
    }

    const json = await fallbackRes.json()
    if (json.success && json.data && Array.isArray(json.data.items)) {
      const items = json.data.items as T[]
      setLocalCache(collection, items)
      return {
        items,
        version: json.data.version || 1,
        fromCache: false,
      }
    }

    return {
      items: cached || defaultItems,
      version: 1,
      fromCache: true,
      error: json.error || "Invalid response format",
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error"
    return {
      items: cached || defaultItems,
      version: 1,
      fromCache: true,
      error: message,
    }
  }
}

/**
 * Save entire collection to Turso LibSQL Edge Database
 * Updates local cache immediately (optimistic UI)
 */
export async function saveCollection<T>(
  collection: string,
  items: T[],
  options?: DriveApiOptions
): Promise<{ success: boolean; version?: number; error?: string; provider?: string }> {
  // Update local cache optimistically
  setLocalCache(collection, items)

  try {
    // 1. Direct save to Turso LibSQL Edge
    const res = await fetch(`/api/turso/${collection}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "writeCollection",
        items,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      if (data.success) {
        return {
          success: true,
          version: data.version,
          provider: "turso",
        }
      }
    }

    // 2. Fallback
    const fallbackRes = await fetch(`/api/drive/${collection}`, {
      method: "POST",
      headers: getHeaders(options),
      body: JSON.stringify({
        action: "writeCollection",
        items,
      }),
    })

    if (!fallbackRes.ok) {
      const text = await fallbackRes.text().catch(() => "")
      return { success: false, error: `Sync failed (${fallbackRes.status}): ${text}` }
    }

    const data = await fallbackRes.json()
    return {
      success: Boolean(data.success),
      version: data.version,
      error: data.error,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Save failed"
    return { success: false, error: message }
  }
}

/**
 * Atomic update or deletion of single item in Turso Edge Database
 */
export async function updateCollectionItem<T extends { id: string }>(
  collection: string,
  item: Partial<T> & { id: string },
  operation: "upsert" | "delete" = "upsert",
  options?: DriveApiOptions
): Promise<{ success: boolean; error?: string; provider?: string }> {
  // Optimistically update local cache
  const cached = getLocalCache<T>(collection) || []
  let updated: T[]
  if (operation === "delete") {
    updated = cached.filter(i => i.id !== item.id)
  } else {
    const idx = cached.findIndex(i => i.id === item.id)
    if (idx >= 0) {
      updated = [...cached]
      updated[idx] = { ...updated[idx], ...item } as T
    } else {
      updated = [item as T, ...cached]
    }
  }
  setLocalCache(collection, updated)

  try {
    // 1. Direct atomic mutate in Turso
    const res = await fetch(`/api/turso/${collection}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: operation === "delete" ? "deleteItem" : "updateItem",
        item,
        operation,
      }),
    })

    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      if (data.success) {
        return { success: true, provider: "turso" }
      }
    }

    // 2. Fallback
    const fallbackRes = await fetch(`/api/drive/${collection}`, {
      method: "POST",
      headers: getHeaders(options),
      body: JSON.stringify({
        action: "updateItem",
        item,
        operation,
      }),
    })

    const data = await fallbackRes.json().catch(() => ({}))
    return { success: Boolean(data.success), error: data.error }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Update item failed"
    return { success: false, error: message }
  }
}

/**
 * Health check on Turso Edge SQLite Database
 */
export async function checkDriveHealth(options?: DriveApiOptions): Promise<{
  connected: boolean
  configured: boolean
  latencyMs?: number
  provider?: string
  error?: string
  info?: {
    serverTime?: string
    sqliteVersion?: string
    collections?: Record<string, number>
  }
}> {
  try {
    const res = await fetch("/api/turso/health", {
      method: "GET",
      cache: "no-store",
    })
    if (res.ok) {
      const data = await res.json()
      return {
        connected: Boolean(data.connected ?? data.success),
        configured: true,
        latencyMs: data.latencyMs,
        provider: data.provider || "Turso (LibSQL Edge)",
        info: data.info,
      }
    }

    // Fallback check
    const fallbackRes = await fetch("/api/drive/health", {
      method: "GET",
      headers: getHeaders(options),
      cache: "no-store",
    })
    return await fallbackRes.json()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Health check request failed"
    return { connected: false, configured: false, error: message }
  }
}

export const checkTursoHealth = checkDriveHealth

/**
 * Initialize Google Drive folder hierarchy & JSON collection files
 */
export async function initializeDriveStorage(options?: DriveApiOptions): Promise<{
  success: boolean
  message?: string
  rootFolderId?: string
  initializedFiles?: string[]
  error?: string
}> {
  try {
    const res = await fetch("/api/drive/init", {
      method: "POST",
      headers: getHeaders(options),
    })
    return await res.json()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Initialization request failed"
    return { success: false, error: message }
  }
}

/**
 * Trigger full Drive backup snapshot
 */
export async function createDriveBackup(options?: DriveApiOptions): Promise<{
  success: boolean
  backupFileName?: string
  timestamp?: string
  error?: string
}> {
  try {
    const res = await fetch("/api/drive/backup", {
      method: "POST",
      headers: getHeaders(options),
    })
    return await res.json()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Backup request failed"
    return { success: false, error: message }
  }
}

/**
 * Upload a real file to Google Drive uploads folder (images, documents, attachments)
 */
export async function uploadFileToDrive(
  file: File,
  folder: "images" | "documents" | "attachments" = "attachments",
  options?: DriveApiOptions
): Promise<{
  success: boolean
  fileId?: string
  fileName?: string
  size?: number
  mimeType?: string
  url?: string
  downloadUrl?: string
  error?: string
}> {
  try {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder", folder)

    const headers: Record<string, string> = {}
    if (options?.gasUrl) headers["x-gas-api-url"] = options.gasUrl
    if (options?.gasKey) headers["x-gas-api-key"] = options.gasKey

    const res = await fetch("/api/drive/upload", {
      method: "POST",
      headers,
      body: formData,
    })

    return await res.json()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "File upload failed"
    return { success: false, error: message }
  }
}

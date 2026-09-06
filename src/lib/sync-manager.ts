"use client"

import { saveCollection, updateCollectionItem } from "./drive-api"
import {
  enqueueMutation,
  getOfflineQueue,
  dequeueMutation,
  getOfflineQueueCount,
} from "./offline-queue"
import { useSyncStore } from "./stores/use-sync-store"

const DEFAULT_DEBOUNCE_MS = 700
const timers = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * Schedules a debounced save for an entire collection
 */
export function scheduleAutoSave<T>(
  collection: string,
  items: T[],
  delayMs = DEFAULT_DEBOUNCE_MS
) {
  const syncStore = useSyncStore.getState()
  syncStore.markSaving()

  const timerKey = `collection:${collection}`
  if (timers.has(timerKey)) {
    clearTimeout(timers.get(timerKey)!)
  }

  const timer = setTimeout(async () => {
    timers.delete(timerKey)
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        enqueueMutation({ collection, action: "writeCollection", items })
        useSyncStore.getState().markOffline()
        return
      }

      const res = await saveCollection(collection, items)
      if (res.success) {
        useSyncStore.getState().markSaved()
      } else {
        enqueueMutation({ collection, action: "writeCollection", items })
        useSyncStore.getState().markError(res.error || "Sync failed")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Auto-save failed"
      enqueueMutation({ collection, action: "writeCollection", items })
      useSyncStore.getState().markError(msg)
    }
  }, delayMs)

  timers.set(timerKey, timer)
}

/**
 * Schedules a debounced upsert for a single item
 */
export function scheduleItemUpsert<T extends { id: string }>(
  collection: string,
  item: T,
  delayMs = DEFAULT_DEBOUNCE_MS
) {
  const syncStore = useSyncStore.getState()
  syncStore.markSaving()

  const timerKey = `item:${collection}:${item.id}`
  if (timers.has(timerKey)) {
    clearTimeout(timers.get(timerKey)!)
  }

  const timer = setTimeout(async () => {
    timers.delete(timerKey)
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        enqueueMutation({ collection, action: "updateItem", operation: "upsert", item })
        useSyncStore.getState().markOffline()
        return
      }

      const res = await updateCollectionItem(collection, item, "upsert")
      if (res.success) {
        useSyncStore.getState().markSaved()
      } else {
        enqueueMutation({ collection, action: "updateItem", operation: "upsert", item })
        useSyncStore.getState().markError(res.error || "Item save failed")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Item save error"
      enqueueMutation({ collection, action: "updateItem", operation: "upsert", item })
      useSyncStore.getState().markError(msg)
    }
  }, delayMs)

  timers.set(timerKey, timer)
}

/**
 * Immediately or debounced delete of a single item
 */
export async function scheduleItemDelete(
  collection: string,
  id: string
) {
  const syncStore = useSyncStore.getState()
  syncStore.markSaving()

  // Cancel any pending upsert timer for this item
  const timerKey = `item:${collection}:${id}`
  if (timers.has(timerKey)) {
    clearTimeout(timers.get(timerKey)!)
    timers.delete(timerKey)
  }

  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      enqueueMutation({ collection, action: "updateItem", operation: "delete", item: { id } })
      useSyncStore.getState().markOffline()
      return
    }

    const res = await updateCollectionItem(collection, { id }, "delete")
    if (res.success) {
      useSyncStore.getState().markSaved()
    } else {
      enqueueMutation({ collection, action: "updateItem", operation: "delete", item: { id } })
      useSyncStore.getState().markError(res.error || "Delete failed")
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Delete error"
    enqueueMutation({ collection, action: "updateItem", operation: "delete", item: { id } })
    useSyncStore.getState().markError(msg)
  }
}

/**
 * Flush all mutations in the offline queue to Google Drive
 */
export async function flushOfflineQueue(): Promise<{ processed: number; failed: number }> {
  const queue = getOfflineQueue()
  if (queue.length === 0) return { processed: 0, failed: 0 }

  const syncStore = useSyncStore.getState()
  syncStore.markSaving()

  let processed = 0
  let failed = 0

  for (const mutation of queue) {
    try {
      let success = false
      if (mutation.action === "writeCollection" && Array.isArray(mutation.items)) {
        const res = await saveCollection(mutation.collection, mutation.items)
        success = Boolean(res.success)
      } else if (mutation.action === "updateItem" && mutation.item) {
        const res = await updateCollectionItem(
          mutation.collection,
          mutation.item as { id: string },
          mutation.operation || "upsert"
        )
        success = Boolean(res.success)
      }

      if (success) {
        dequeueMutation(mutation.id)
        processed++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }

  if (failed === 0) {
    syncStore.markSaved()
  } else {
    syncStore.markError(`${failed} changes pending sync`)
  }

  return { processed, failed }
}

/**
 * Flush pending timers immediately and process offline queue
 */
export async function flushPending(): Promise<{ processed: number; failed: number }> {
  // Clear any pending debounce timers
  for (const [key, timer] of timers.entries()) {
    clearTimeout(timer)
    timers.delete(key)
  }
  return flushOfflineQueue()
}

// ── Initialize Network & Queue Listeners ──────────────────────────────────────
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushOfflineQueue()
  })

  window.addEventListener("offline", () => {
    useSyncStore.getState().markOffline()
  })
}

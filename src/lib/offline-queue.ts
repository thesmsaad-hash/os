"use client"

export interface QueuedMutation {
  id: string
  collection: string
  action: "writeCollection" | "updateItem"
  operation?: "upsert" | "delete"
  item?: unknown
  items?: unknown[]
  timestamp: number
  retryCount: number
}

const OFFLINE_QUEUE_KEY = "personal_os_offline_queue"

export function getOfflineQueue(): QueuedMutation[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveOfflineQueue(queue: QueuedMutation[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
    window.dispatchEvent(new CustomEvent("offline-queue-changed", { detail: queue.length }))
  } catch {}
}

export function enqueueMutation(mutation: Omit<QueuedMutation, "id" | "timestamp" | "retryCount">) {
  const current = getOfflineQueue()
  
  // Deduplicate if writeCollection for the same collection already exists in queue
  let updated: QueuedMutation[]
  if (mutation.action === "writeCollection") {
    updated = current.filter(m => !(m.collection === mutation.collection && m.action === "writeCollection"))
  } else {
    updated = [...current]
  }

  const newEntry: QueuedMutation = {
    ...mutation,
    id: "mut_" + Math.random().toString(36).substring(2, 9),
    timestamp: Date.now(),
    retryCount: 0,
  }

  updated.push(newEntry)
  saveOfflineQueue(updated)
  return newEntry
}

export function dequeueMutation(id: string) {
  const current = getOfflineQueue()
  const updated = current.filter(m => m.id !== id)
  saveOfflineQueue(updated)
}

export function clearOfflineQueue() {
  saveOfflineQueue([])
}

export function getOfflineQueueCount(): number {
  return getOfflineQueue().length
}

"use client"

import { create } from "zustand"
import type { FinanceTransaction } from "../types/drive"
import { fetchCollection, saveCollection, updateCollectionItem } from "../drive-api"
import { useSyncStore } from "./use-sync-store"

const INITIAL_TRANSACTIONS: FinanceTransaction[] = [
  { id: "tx1", description: "Software Subscription", amount: 20, type: "expense", category: "software", date: "2026-09-01" },
  { id: "tx2", description: "Client Retainer", amount: 1500, type: "income", category: "freelance", date: "2026-09-02" },
  { id: "tx3", description: "Workspace Cloud Hosting", amount: 15, type: "expense", category: "infra", date: "2026-09-05" },
]

interface FinanceState {
  transactions: FinanceTransaction[]
  isLoading: boolean
  hasLoaded: boolean

  loadTransactions: () => Promise<void>
  addTransaction: (tx: Omit<FinanceTransaction, "id">) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  transactions: INITIAL_TRANSACTIONS,
  isLoading: false,
  hasLoaded: false,

  loadTransactions: async () => {
    set({ isLoading: true })
    const sync = useSyncStore.getState()
    sync.startSync()

    try {
      const res = await fetchCollection<FinanceTransaction>("finance", INITIAL_TRANSACTIONS)
      set({ transactions: res.items, isLoading: false, hasLoaded: true })
      sync.finishSync()
    } catch {
      set({ isLoading: false, hasLoaded: true })
      sync.failSync("Failed to load transactions")
    }
  },

  addTransaction: async (txInput) => {
    const newTx: FinanceTransaction = {
      ...txInput,
      id: "tx_" + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    }
    const nextTx = [newTx, ...get().transactions]
    set({ transactions: nextTx })

    const sync = useSyncStore.getState()
    sync.startSync()
    const res = await saveCollection("finance", nextTx)
    if (res.success) sync.finishSync()
    else sync.failSync(res.error || "Save transaction failed")
  },

  deleteTransaction: async (id) => {
    const nextTx = get().transactions.filter(t => t.id !== id)
    set({ transactions: nextTx })

    const sync = useSyncStore.getState()
    sync.startSync()
    const res = await updateCollectionItem("finance", { id }, "delete")
    if (res.success) sync.finishSync()
    else sync.failSync(res.error || "Delete transaction failed")
  },
}))

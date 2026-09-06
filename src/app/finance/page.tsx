"use client"

import { useState } from "react"
import {
  Plus, TrendingUp, TrendingDown, DollarSign,
  Wallet, PiggyBank, X, ArrowUpRight, ArrowDownRight,
  ShoppingCart, Coffee, Car, Home, Zap, Film, Briefcase,
  Monitor, Heart, MoreHorizontal
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns"

// ── types ─────────────────────────────────────────────────────────────────────
type TxType = "Income" | "Expense"

interface Transaction {
  id:          string
  type:        TxType
  amount:      number
  category:    string
  description: string
  date:        Date
}

function uid() { return Math.random().toString(36).slice(2) }
function fmt(n: number) { return n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }) }

// ── mock data ─────────────────────────────────────────────────────────────────
const now = new Date()

const EXPENSE_CATS = ["Food", "Transport", "Housing", "Utilities", "Entertainment", "Health", "Shopping", "Software", "Other"]
const INCOME_CATS  = ["Freelance", "Salary", "YouTube", "Course Sales", "Consulting", "Other"]

const CAT_ICONS: Record<string, React.ElementType> = {
  Food: Coffee, Transport: Car, Housing: Home, Utilities: Zap,
  Entertainment: Film, Freelance: Briefcase, YouTube: Film,
  Software: Monitor, Health: Heart, Shopping: ShoppingCart,
}

const CAT_COLORS: Record<string, string> = {
  Food: "bg-amber-500/15 text-amber-400", Transport: "bg-blue-500/15 text-blue-400",
  Housing: "bg-violet-500/15 text-violet-400", Utilities: "bg-cyan-500/15 text-cyan-400",
  Entertainment: "bg-rose-500/15 text-rose-400", Freelance: "bg-emerald-500/15 text-emerald-400",
  YouTube: "bg-red-500/15 text-red-400", Software: "bg-slate-500/15 text-slate-400",
  Health: "bg-pink-500/15 text-pink-400", Shopping: "bg-orange-500/15 text-orange-400",
  "Course Sales": "bg-indigo-500/15 text-indigo-400", Consulting: "bg-teal-500/15 text-teal-400",
}

const mockTransactions: Transaction[] = [
  { id:"1",  type:"Income",  amount:3500, category:"Freelance",     description:"ABC Corp video project",   date: now },
  { id:"2",  type:"Expense", amount:120,  category:"Software",      description:"Adobe Creative Cloud",      date: now },
  { id:"3",  type:"Income",  amount:840,  category:"YouTube",       description:"August AdSense payout",     date: subDays(now,1) },
  { id:"4",  type:"Expense", amount:65,   category:"Food",          description:"Weekly groceries",          date: subDays(now,2) },
  { id:"5",  type:"Income",  amount:1200, category:"Consulting",    description:"Brand strategy call",       date: subDays(now,3) },
  { id:"6",  type:"Expense", amount:1800, category:"Housing",       description:"Monthly rent",              date: subDays(now,3) },
  { id:"7",  type:"Expense", amount:45,   category:"Transport",     description:"Fuel",                      date: subDays(now,4) },
  { id:"8",  type:"Expense", amount:29,   category:"Entertainment", description:"Netflix + Spotify",         date: subDays(now,5) },
  { id:"9",  type:"Income",  amount:499,  category:"Course Sales",  description:"After Effects course sale", date: subDays(now,6) },
  { id:"10", type:"Expense", amount:80,   category:"Health",        description:"Gym membership",            date: subDays(now,7) },
  { id:"11", type:"Expense", amount:22,   category:"Food",          description:"Coffee shop",               date: subDays(now,8) },
  { id:"12", type:"Income",  amount:2000, category:"Freelance",     description:"Logo design project",       date: subDays(now,10) },
  { id:"13", type:"Expense", amount:150,  category:"Shopping",      description:"Desk accessories",          date: subDays(now,11) },
  { id:"14", type:"Expense", amount:200,  category:"Utilities",     description:"Internet + electricity",    date: subDays(now,12) },
]

const MONTHLY_BUDGET = 3000

// ── AddTransaction modal ──────────────────────────────────────────────────────
function AddTransactionModal({ onClose, onAdd }: { onClose: () => void; onAdd: (t: Transaction) => void }) {
  const [type, setType]     = useState<TxType>("Expense")
  const [amount, setAmount] = useState("")
  const [cat, setCat]       = useState("Food")
  const [desc, setDesc]     = useState("")
  const [date, setDate]     = useState(format(now, "yyyy-MM-dd"))

  const cats = type === "Income" ? INCOME_CATS : EXPENSE_CATS

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border rounded-xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Add Transaction</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-col gap-3">
          {/* type toggle */}
          <div className="flex rounded-lg overflow-hidden border">
            {(["Expense","Income"] as TxType[]).map(t => (
              <button key={t} onClick={() => { setType(t); setCat(t === "Income" ? "Freelance" : "Food") }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${type === t
                  ? t === "Income" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                  : "text-muted-foreground hover:bg-muted"
                }`}
              >{t}</button>
            ))}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-2 text-muted-foreground text-sm">$</span>
            <Input placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} className="pl-7" type="number" autoFocus />
          </div>
          <select value={cat} onChange={e => setCat(e.target.value)} className="w-full text-sm border rounded-md px-3 py-1.5 bg-background">
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
          <Input placeholder="Description..." value={desc} onChange={e => setDesc(e.target.value)} />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full text-sm border rounded-md px-3 py-1.5 bg-background" />
          <Button
            onClick={() => {
              if (!amount || parseFloat(amount) <= 0) return
              onAdd({ id: uid(), type, amount: parseFloat(amount), category: cat, description: desc || cat, date: new Date(date + "T00:00") })
              onClose()
            }}
            disabled={!amount || parseFloat(amount) <= 0}
            className={`w-full mt-1 ${type === "Income" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"} text-white`}
          >
            Add {type}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── MiniBarChart ──────────────────────────────────────────────────────────────
function MiniBarChart({ transactions }: { transactions: Transaction[] }) {
  const days = eachDayOfInterval({ start: subDays(now, 13), end: now })
  const data = days.map(d => {
    const ds = format(d, "yyyy-MM-dd")
    const income  = transactions.filter(t => t.type === "Income"  && format(t.date, "yyyy-MM-dd") === ds).reduce((a, t) => a + t.amount, 0)
    const expense = transactions.filter(t => t.type === "Expense" && format(t.date, "yyyy-MM-dd") === ds).reduce((a, t) => a + t.amount, 0)
    return { d, income, expense }
  })
  const max = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1)

  return (
    <div className="flex items-end gap-1 h-20">
      {data.map(({ d, income, expense }, i) => (
        <div key={i} className="flex gap-0.5 items-end flex-1">
          <div className="flex-1 rounded-t-sm bg-emerald-500/60 min-h-0.5" style={{ height: `${(income / max) * 100}%` }} title={`Income: ${fmt(income)}`} />
          <div className="flex-1 rounded-t-sm bg-red-500/60 min-h-0.5" style={{ height: `${(expense / max) * 100}%` }} title={`Expense: ${fmt(expense)}`} />
        </div>
      ))}
    </div>
  )
}

// ── CategoryBreakdown ─────────────────────────────────────────────────────────
function CategoryBreakdown({ transactions }: { transactions: Transaction[] }) {
  const expenses = transactions.filter(t => t.type === "Expense")
  const total    = expenses.reduce((a, t) => a + t.amount, 0)
  const groups: Record<string, number> = {}
  expenses.forEach(t => { groups[t.category] = (groups[t.category] ?? 0) + t.amount })
  const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 6)

  return (
    <div className="flex flex-col gap-2">
      {sorted.map(([cat, amt]) => {
        const pct  = total ? Math.round((amt / total) * 100) : 0
        const Icon = CAT_ICONS[cat] ?? DollarSign
        return (
          <div key={cat} className="flex items-center gap-3">
            <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${CAT_COLORS[cat] ?? "bg-muted text-muted-foreground"}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1 text-xs">
                <span className="font-medium">{cat}</span>
                <span className="text-muted-foreground">{fmt(amt)} · {pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function FinancePage() {
  const [transactions, setTx] = useState<Transaction[]>(mockTransactions)
  const [showAdd, setShowAdd] = useState(false)

  const thisMonth = transactions.filter(t =>
    t.date >= startOfMonth(now) && t.date <= endOfMonth(now)
  )

  const totalIncome  = thisMonth.filter(t => t.type === "Income").reduce((a, t) => a + t.amount, 0)
  const totalExpense = thisMonth.filter(t => t.type === "Expense").reduce((a, t) => a + t.amount, 0)
  const savings      = totalIncome - totalExpense
  const budgetUsed   = Math.min(Math.round((totalExpense / MONTHLY_BUDGET) * 100), 100)

  const recent = [...transactions].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8)

  return (
    <div className="h-full overflow-auto">
      {showAdd && <AddTransactionModal onClose={() => setShowAdd(false)} onAdd={t => setTx(txs => [t, ...txs])} />}

      <div className="max-w-6xl mx-auto p-6 flex flex-col gap-6">
        {/* header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Finance</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{format(now, "MMMM yyyy")}</p>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Transaction
          </Button>
        </div>

        {/* stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:"Income",   value: fmt(totalIncome),  icon: TrendingUp,   color:"text-emerald-400 bg-emerald-500/10" },
            { label:"Expenses", value: fmt(totalExpense), icon: TrendingDown,  color:"text-red-400 bg-red-500/10" },
            { label:"Savings",  value: fmt(savings),      icon: PiggyBank,    color: savings >= 0 ? "text-blue-400 bg-blue-500/10" : "text-red-400 bg-red-500/10" },
            { label:"Budget",   value: `${budgetUsed}% used`, icon: Wallet,   color: budgetUsed > 90 ? "text-red-400 bg-red-500/10" : "text-amber-400 bg-amber-500/10" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card border rounded-xl p-5 flex items-start gap-4">
              <div className={`p-2 rounded-lg ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className="text-xl font-bold mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* budget bar */}
        <div className="bg-card border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-medium">Monthly Budget</span>
            <span className="text-muted-foreground">{fmt(totalExpense)} / {fmt(MONTHLY_BUDGET)}</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${budgetUsed > 90 ? "bg-red-500" : budgetUsed > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${budgetUsed}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{fmt(MONTHLY_BUDGET - totalExpense)} remaining this month</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity chart */}
          <div className="bg-card border rounded-xl p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-sm">14-Day Activity</h2>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500/60 inline-block" />Income</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-red-500/60 inline-block" />Expense</span>
              </div>
            </div>
            <MiniBarChart transactions={transactions} />
          </div>

          {/* Category breakdown */}
          <div className="bg-card border rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-4">By Category</h2>
            <CategoryBreakdown transactions={thisMonth} />
          </div>
        </div>

        {/* Recent transactions */}
        <div className="bg-card border rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="font-semibold text-sm">Recent Transactions</h2>
            <span className="text-xs text-muted-foreground">{transactions.length} total</span>
          </div>
          <div className="divide-y divide-border">
            {recent.map(tx => {
              const Icon = CAT_ICONS[tx.category] ?? DollarSign
              return (
                <div key={tx.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${CAT_COLORS[tx.category] ?? "bg-muted text-muted-foreground"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">{tx.category} · {format(tx.date, "MMM d, yyyy")}</p>
                  </div>
                  <div className={`text-sm font-semibold flex items-center gap-1 ${tx.type === "Income" ? "text-emerald-400" : "text-red-400"}`}>
                    {tx.type === "Income" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    {tx.type === "Income" ? "+" : "-"}{fmt(tx.amount)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

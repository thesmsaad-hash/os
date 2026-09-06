import { createClient } from "@libsql/client"
import * as dotenv from "dotenv"

dotenv.config()

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const INITIAL_DATA = {
  users: [
    {
      id: "user_primary",
      name: "Saad",
      email: "saad@personal-os.local",
      avatar: "",
      timezone: "Asia/Karachi",
      plan: "Pro",
      preferences: {
        theme: "dark",
        compactMode: false,
        soundEffects: true,
        ambientSound: "rain",
        showGreeting: true,
        enableAnimations: true,
        analyticsTracking: false,
        crashReports: false,
      },
    },
  ],
  tasks: [
    { id: "1", title: "Review client video draft", priority: "High", status: "In Progress", tags: ["client", "video"], dueDate: "2026-09-06" },
    { id: "2", title: "Write project proposal", priority: "Medium", status: "Todo", tags: ["writing"], dueDate: "2026-09-07" },
    { id: "3", title: "Update portfolio website", priority: "Low", status: "Todo", tags: ["design"], dueDate: "2026-09-08" },
    { id: "4", title: "Team sync call", priority: "High", status: "Todo", tags: ["meeting"], dueDate: "2026-09-06" },
    { id: "5", title: "Prepare invoice", priority: "Medium", status: "Todo", tags: ["finance"], dueDate: "2026-09-07" },
    { id: "6", title: "Ship v2 release", priority: "Urgent", status: "In Progress", tags: ["dev"], dueDate: "2026-09-06" },
  ],
  projects: [
    {
      id: "proj-1",
      name: "Client Video — ABC Corp",
      description: "Brand refresh video package for ABC Corp. Includes 3 videos.",
      status: "Active",
      color: "bg-violet-500",
      dueDate: "2026-09-20",
      tasks: [
        { id: "t1", title: "Write script", status: "Done", priority: "High" },
        { id: "t2", title: "Record footage", status: "In Progress", priority: "High" },
        { id: "t3", title: "Edit main cut", status: "Todo", priority: "High" },
        { id: "t4", title: "Color grading", status: "Todo", priority: "Medium" },
        { id: "t5", title: "Sound design", status: "Todo", priority: "Medium" },
      ],
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
    {
      id: "proj-2",
      name: "Portfolio Website Redesign",
      description: "Personal portfolio redesign with modern case studies and Personal OS docs.",
      status: "Active",
      color: "bg-blue-500",
      dueDate: "2026-09-30",
      tasks: [
        { id: "t8", title: "Wireframes", status: "Done", priority: "High" },
        { id: "t9", title: "Develop homepage", status: "Done", priority: "High" },
        { id: "t10", title: "Add case studies", status: "In Progress", priority: "Medium" },
      ],
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
  ],
  events: [
    { id: "e1", title: "Product Strategy Meeting", start: "2026-09-06T10:00:00.000Z", end: "2026-09-06T11:00:00.000Z", category: "work", color: "#8b5cf6" },
    { id: "e2", title: "Gym Workout", start: "2026-09-06T17:30:00.000Z", end: "2026-09-06T18:30:00.000Z", category: "health", color: "#10b981" },
    { id: "e3", title: "Personal OS Architecture Review", start: "2026-09-07T14:00:00.000Z", end: "2026-09-07T15:00:00.000Z", category: "work", color: "#3b82f6" },
  ],
  notes: [
    { id: "n1", title: "Project Architecture Notes", content: "Personal OS runs natively on Turso LibSQL Edge SQLite database with sub-20ms latency.", tags: ["architecture", "dev"], pinned: true, createdAt: "2026-09-06T08:00:00.000Z", updatedAt: "2026-09-06T08:00:00.000Z" },
    { id: "n2", title: "Weekly Goals & Focus", content: "1. Full Turso backend migration.\n2. Verify ntfy mobile alerts.\n3. Test sub-20ms edge throughput.", tags: ["goals"], pinned: false, createdAt: "2026-09-06T08:30:00.000Z", updatedAt: "2026-09-06T08:30:00.000Z" },
  ],
  whiteboards: [
    {
      id: "board-1",
      name: "Product OS Architecture",
      elements: [
        { id: "w1", type: "sticky", x: 120, y: 120, text: "Personal OS v2.0\nPowered by Turso LibSQL Edge Database\n9 GB free · 24/7 uptime", color: "#7c3aed", bg: "#f3e8ff" },
        { id: "w2", type: "sticky", x: 340, y: 120, text: "Next.js 16 + Turbopack\nZustand State\nTailwind CSS", color: "#0284c7", bg: "#e0f2fe" },
      ],
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
  ],
  habits: [
    { id: "h1", name: "Morning Meditation", frequency: "daily", streak: 5, bestStreak: 14, completedDates: ["2026-09-06", "2026-09-05", "2026-09-04"] },
    { id: "h2", name: "Read 20 Pages", frequency: "daily", streak: 8, bestStreak: 12, completedDates: ["2026-09-06", "2026-09-05"] },
    { id: "h3", name: "Deep Work (2+ hrs)", frequency: "daily", streak: 12, bestStreak: 20, completedDates: ["2026-09-06", "2026-09-05", "2026-09-04"] },
  ],
  journal: [
    {
      id: "j-1",
      date: "2026-09-06T09:00:00.000Z",
      mood: "great",
      content: "Successfully upgraded the backend of Personal OS to Turso LibSQL Edge Database! Speed is instantaneous, queries execute in milliseconds, and the database runs 24/7 without pausing.",
      tags: ["milestone", "turso", "tech"],
      createdAt: "2026-09-06T09:00:00.000Z",
      updatedAt: "2026-09-06T09:00:00.000Z",
    },
  ],
  goals: [
    {
      id: "goal-1",
      title: "Hit 50K YouTube Subscribers",
      description: "Grow the channel to 50,000 subscribers by end of 2026 with consistent, high-quality content.",
      category: "Career",
      targetDate: "2026-12-31",
      color: "bg-violet-500",
      milestones: [
        { id: "m1", title: "Reach 10K subscribers", done: true },
        { id: "m2", title: "Post 20 tutorial videos", done: true },
        { id: "m3", title: "Launch channel trailer", done: true },
        { id: "m4", title: "Reach 25K subscribers", done: false },
      ],
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
    {
      id: "goal-2",
      title: "Build $10K/mo Client Pipeline",
      description: "Scale high-ticket video editing & consulting clients to consistent monthly revenue.",
      category: "Finance",
      targetDate: "2026-11-30",
      color: "bg-emerald-500",
      milestones: [
        { id: "m8", title: "Build case-study landing page", done: true },
        { id: "m9", title: "Sign 2 retainer clients", done: true },
        { id: "m10", title: "Reach $5K/mo milestone", done: true },
      ],
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
  ],
  bookmarks: [
    {
      id: "bm-1",
      url: "https://turso.tech",
      title: "Turso Edge Database",
      description: "SQLite-compatible database built for the edge. Super fast, low latency, generous free tier.",
      category: "Tools",
      tags: ["database", "edge", "sqlite"],
      isFavorite: true,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
    {
      id: "bm-2",
      url: "https://linear.app",
      title: "Linear",
      description: "Issue tracking for modern software teams. Beautiful, streamlined, and fast.",
      category: "Tools",
      tags: ["productivity", "pm"],
      isFavorite: true,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
  ],
  files: [
    {
      id: "f-1",
      name: "turso_architecture_diagram.png",
      type: "image",
      size: 1048576,
      category: "Architecture",
      tags: ["turso", "backend"],
      url: "https://turso.tech",
      createdAt: "2026-09-01T00:00:00.000Z",
    },
  ],
}

async function seed() {
  console.log("Seeding Turso database collections...")
  const now = new Date().toISOString()

  for (const [collection, items] of Object.entries(INITIAL_DATA)) {
    // Check if collection already has items
    const existing = await client.execute({
      sql: "SELECT count(*) as count FROM collections WHERE collection = ?",
      args: [collection],
    })
    
    if (Number(existing.rows[0].count) > 0) {
      console.log(`- ${collection}: already has ${existing.rows[0].count} items, skipping.`)
      continue
    }

    const tx = await client.transaction("write")
    try {
      for (const item of items) {
        await tx.execute({
          sql: "INSERT INTO collections (collection, id, data, version, updated_at) VALUES (?, ?, ?, 1, ?)",
          args: [collection, item.id, JSON.stringify(item), now],
        })
      }
      await tx.execute({
        sql: `INSERT INTO sync_meta (collection, version, last_sync) VALUES (?, 1, ?)
              ON CONFLICT(collection) DO UPDATE SET version = 1, last_sync = excluded.last_sync`,
        args: [collection, now],
      })
      await tx.commit()
      console.log(`✓ ${collection}: seeded ${items.length} items`)
    } catch (e) {
      await tx.rollback()
      console.error(`✗ Error seeding ${collection}:`, e)
    }
  }

  const rs = await client.execute("SELECT collection, count(*) as count FROM collections GROUP BY collection")
  console.log("\nSummary of all collections currently in Turso:")
  for (const row of rs.rows) {
    console.log(`- ${row.collection}: ${row.count} records`)
  }
}

seed().catch(console.error)

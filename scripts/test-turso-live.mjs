async function testTurso() {
  console.log("=== Testing Turso Endpoints Live ===")
  
  // 1. Health
  try {
    const healthRes = await fetch("http://localhost:3000/api/turso/health")
    const health = await healthRes.json()
    console.log("1. /api/turso/health:", health.status, "latency:", health.latencyMs, "ms")
    console.log("   Collections in DB:", JSON.stringify(health.info?.collections))
  } catch (e) {
    console.error("1. Health check failed:", e.message)
  }

  // 2. Tasks collection
  try {
    const tasksRes = await fetch("http://localhost:3000/api/turso/tasks")
    const tasks = await tasksRes.json()
    console.log("2. /api/turso/tasks: items count =", tasks.items?.length, "version =", tasks.version)
  } catch (e) {
    console.error("2. Tasks check failed:", e.message)
  }

  // 3. Notes collection
  try {
    const notesRes = await fetch("http://localhost:3000/api/turso/notes")
    const notes = await notesRes.json()
    console.log("3. /api/turso/notes: items count =", notes.items?.length, "version =", notes.version)
  } catch (e) {
    console.error("3. Notes check failed:", e.message)
  }

  // 4. Test mutation (upsert item)
  try {
    const mutateRes = await fetch("http://localhost:3000/api/turso/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateItem",
        item: {
          id: "task-live-test",
          title: "Verify Turso Live Backend",
          completed: true,
          status: "done",
          priority: "high"
        }
      })
    })
    const mutateJson = await mutateRes.json()
    console.log("4. /api/turso/tasks mutate upsert:", mutateJson.success, "version =", mutateJson.version)
  } catch (e) {
    console.error("4. Mutation test failed:", e.message)
  }

  // 5. Test delete item
  try {
    const deleteRes = await fetch("http://localhost:3000/api/turso/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "deleteItem",
        item: { id: "task-live-test" }
      })
    })
    const deleteJson = await deleteRes.json()
    console.log("5. /api/turso/tasks mutate delete:", deleteJson.success, "version =", deleteJson.version)
  } catch (e) {
    console.error("5. Delete test failed:", e.message)
  }

  // 6. Test app pages
  const pages = ["/", "/tasks", "/notes", "/calendar", "/goals", "/habits", "/journal", "/whiteboard", "/settings"]
  console.log("\n=== Testing App Pages HTTP Status ===")
  for (const page of pages) {
    try {
      const res = await fetch(`http://localhost:3000${page}`)
      console.log(`- ${page.padEnd(15)}: HTTP ${res.status}`)
    } catch (e) {
      console.log(`- ${page.padEnd(15)}: Error ${e.message}`)
    }
  }
}

testTurso()

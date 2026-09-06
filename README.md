# Personal OS

A modern, high-performance, edge-first personal productivity operating system built with **Next.js 15 (App Router)**, **Turso (LibSQL Edge Database)**, **Google Assistant Voice Webhooks**, **Google Calendar 2-Way Synchronization**, and **Cloudflare Pages / Workers**.

---

## ⚡ Features

- **Distributed Turso LibSQL Backend**: 24/7 always-on edge database with sub-25ms response latency, zero cold starts, and optimistic 700ms debounce auto-save.
- **🎙️ Google Assistant Voice Webhooks**: Natural language speech parser accepting tasks, calendar events, and schedule queries directly from Google Assistant, IFTTT, and mobile shortcuts.
- **📅 Google Calendar Integration**: Live RFC 5545 iCalendar (`.ics`) subscription feed (`/api/calendar/feed`) and direct two-way synchronization via Google Apps Script.
- **🔔 Mobile Push Alerts via ntfy**: Instant phone notifications on task creation, event reminders, and focus session completions.
- **🌤️ Interactive Google Search-Style Weather**: Real-time 7-day weather card with GPS auto-detection, °C/°F toggle, and Turso persistence.
- **☁️ Cloudflare Ready**: Pre-configured `wrangler.jsonc` with Node.js compatibility for 1-click deployment on Cloudflare Pages and Workers.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Configure your `.env` with:
```env
TURSO_DATABASE_URL="libsql://personal-os-saad19.aws-ap-south-1.turso.io"
TURSO_AUTH_TOKEN="your_turso_token"
GAS_API_URL="https://script.google.com/macros/s/.../exec"
GAS_API_KEY="personal_os_secret_key_2026"
NTFY_TOPIC="personal-os-saad"
NTFY_TOKEN="your_ntfy_token"
```

### 3. Run Locally
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access Personal OS.

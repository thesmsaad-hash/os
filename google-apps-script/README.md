# Google Apps Script Setup Guide for Personal OS

This script connects your **Personal OS** directly to your personal **Google Drive** for zero-cost JSON storage and backup management, without needing a PostgreSQL server.

---

## 1. Create the Script (1 Minute)

1. Open [script.google.com](https://script.google.com) and click **"New project"**.
2. Rename the project from "Untitled project" to **`Personal OS Backend`**.
3. Select all code in `Code.gs` and replace it with the contents of [`Code.gs`](file:///c:/Users/smsaa/Downloads/wd/google-apps-script/Code.gs).
4. Click the **Save** icon (diskette) or press `Ctrl + S`.

---

## 2. (Optional) Set Script Properties for Security

If you want a custom secret API key instead of the default:
1. In the Apps Script editor, click **Project Settings** (gear icon on left).
2. Scroll down to **Script Properties** and click **Edit script properties**.
3. Add:
   - `API_KEY`: e.g. `your_custom_secret_key` (matches `GAS_API_KEY` in your `.env`)
   - `NTFY_TOPIC`: `personal-os-saad`
   - `NTFY_TOKEN`: `tk_eq6wkwwicwmc7gdmeroqx50he0n8p`
4. Click **Save script properties**.

---

## 3. Deploy as Web App

1. In the top right corner, click **Deploy** → **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Configure:
   - **Description**: `Personal OS API v1`
   - **Execute as**: **Me (your-email@gmail.com)**
   - **Who has access**: **Anyone** *(Protected by your API key in all payloads)*
4. Click **Deploy**.
5. Google will ask you to **Authorize access** to Google Drive. Click **Authorize access**, select your Google account, click **Advanced**, and click **Go to Personal OS Backend (unsafe)** to grant Drive permissions.
6. Copy the **Web App URL** (ends in `/exec`).

---

## 4. Connect to Personal OS

Paste the Web App URL and your secret key into your `.env` file:

```env
GAS_API_URL="https://script.google.com/macros/s/AKfycb.../exec"
GAS_API_KEY="personal_os_secret_key_2026"
```

Or configure it inside **Personal OS → Settings → Cloud Storage**!
Click **Initialize Drive Storage** to automatically create:
```
Google Drive/
└── Personal OS/
    ├── data/
    │   ├── tasks.json
    │   ├── projects.json
    │   ├── events.json
    │   ├── notes.json
    │   ├── ...
    ├── uploads/
    └── backups/
```

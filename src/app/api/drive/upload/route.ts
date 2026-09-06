import { NextResponse } from "next/server"

function getGasConfig(req?: Request) {
  const customUrl = req?.headers.get("x-gas-api-url")
  const customKey = req?.headers.get("x-gas-api-key")

  const url = (customUrl || process.env.GAS_API_URL || process.env.NEXT_PUBLIC_GAS_API_URL || "").trim()
  const key = (customKey || process.env.GAS_API_KEY || "personal_os_secret_key_2026").trim()

  return { url, key }
}

export async function POST(req: Request) {
  try {
    const { url, key } = getGasConfig(req)

    if (!url) {
      return NextResponse.json(
        { success: false, error: "GAS_API_URL is not configured", offline: true },
        { status: 503 }
      )
    }

    const contentType = req.headers.get("content-type") || ""

    let folder = "attachments"
    let fileName = `file-${Date.now()}`
    let mimeType = "application/octet-stream"
    let base64Data = ""

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      const file = formData.get("file") as File | null
      const customFolder = formData.get("folder") as string | null

      if (!file) {
        return NextResponse.json({ success: false, error: "No file provided in form data" }, { status: 400 })
      }

      fileName = file.name
      mimeType = file.type || "application/octet-stream"
      if (customFolder) folder = customFolder

      // Convert File Buffer to Base64
      const arrayBuffer = await file.arrayBuffer()
      base64Data = Buffer.from(arrayBuffer).toString("base64")
    } else {
      const body = await req.json()
      folder = body.folder || "attachments"
      fileName = body.fileName || fileName
      mimeType = body.mimeType || mimeType
      base64Data = body.base64Data || ""
    }

    if (!base64Data) {
      return NextResponse.json({ success: false, error: "Missing file payload / base64Data" }, { status: 400 })
    }

    const payload = {
      action: "uploadFile",
      apiKey: key,
      folder,
      fileName,
      mimeType,
      base64Data,
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      return NextResponse.json(
        { success: false, error: `Google Apps Script returned ${response.status}: ${text}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "File upload proxy error"
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 })
  }
}

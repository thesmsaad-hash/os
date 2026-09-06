import { NextResponse } from "next/server"

const MASTER_EMAIL = "smsaad05082003@gmail.com"
const MASTER_PASSWORD = "victus"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = (body.email || "").trim().toLowerCase()
    const password = (body.password || "").trim()

    if (email === MASTER_EMAIL && password === MASTER_PASSWORD) {
      return NextResponse.json({
        success: true,
        user: {
          id: "user_saad",
          name: "Saad",
          email: MASTER_EMAIL,
          role: "Owner / Master Access",
        },
        token: `pos_tok_${Date.now()}`,
      })
    }

    return NextResponse.json({
      success: false,
      error: "Invalid credentials.",
    }, { status: 401 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Auth error"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

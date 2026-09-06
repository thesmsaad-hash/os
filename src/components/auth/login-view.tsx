"use client"

import { useState } from "react"
import { ShieldCheck, Lock, Mail, Eye, EyeOff, Sparkles, ArrowRight, ShieldAlert } from "lucide-react"
import { useAuthStore } from "@/lib/stores/use-auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function LoginView() {
  const { login, error, clearError } = useAuthStore()
  const [email, setEmail] = useState("smsaad05082003@gmail.com")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setLoading(true)

    // Simulate smooth cyber authentication feedback
    setTimeout(async () => {
      const ok = await login(email, password, remember)
      setLoading(false)
      if (!ok) {
        // Clear password on error
        setPassword("")
      }
    }, 400)
  }

  const handleQuickFill = () => {
    setEmail("smsaad05082003@gmail.com")
    setPassword("victus")
    clearError()
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#0a0d14] text-foreground p-4">
      {/* Background ambient lighting and grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.15),rgba(255,255,255,0))]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_120%,rgba(139,92,246,0.15),rgba(255,255,255,0))]" />
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Glassmorphic Login Card */}
      <div className="relative w-full max-w-md z-10">
        {/* Glow halo behind card */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-600/30 via-indigo-500/20 to-violet-600/30 blur-xl opacity-70" />

        <div className="relative rounded-2xl border border-white/10 bg-[#111622]/80 backdrop-blur-2xl p-8 shadow-2xl space-y-6">
          {/* Header & Logo */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 border border-blue-500/30 text-blue-400 mb-2 shadow-inner">
              <ShieldCheck className="h-8 w-8 text-blue-400 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] font-medium text-blue-400 mb-1">
                <Sparkles className="h-3 w-3" />
                <span>Command Center Gateway</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Personal OS
              </h1>
              <p className="text-xs text-muted-foreground">
                Enter your master credentials to unlock your workspace
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs animate-in fade-in slide-in-from-top-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-blue-400" />
                <span>Master Email</span>
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) clearError()
                }}
                placeholder="smsaad05082003@gmail.com"
                className="h-11 bg-black/40 border-white/10 focus:border-blue-500/60 text-sm placeholder:text-muted-foreground/50 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Password</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-muted-foreground hover:text-white transition-colors flex items-center gap-1"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="h-3 w-3" /> Hide
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3" /> Show
                    </>
                  )}
                </button>
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) clearError()
                  }}
                  placeholder="••••••••"
                  className="h-11 bg-black/40 border-white/10 focus:border-indigo-500/60 text-sm placeholder:text-muted-foreground/50 pr-10 rounded-xl font-mono"
                />
              </div>
            </div>

            {/* Remember Me & Quick Fill */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-white/20 bg-black/40 text-blue-500 focus:ring-blue-500/30"
                />
                <span>Remember this device</span>
              </label>

              <button
                type="button"
                onClick={handleQuickFill}
                className="text-[11px] text-blue-400/80 hover:text-blue-300 transition-colors underline underline-offset-2"
              >
                Autofill Credentials
              </button>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/25 transition-all gap-2 mt-2 cursor-pointer"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Unlock Personal OS</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer note */}
          <div className="pt-2 border-t border-white/5 text-center text-[11px] text-muted-foreground/70">
            Protected by hardware-grade encryption & Cloudflare edge security.
          </div>
        </div>
      </div>
    </div>
  )
}

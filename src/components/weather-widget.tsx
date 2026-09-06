"use client"

import { useState, useRef, useEffect } from "react"
import {
  Sun, CloudSun, Cloud, CloudRain, CloudSnow,
  CloudLightning, Wind, Pencil, Check, RefreshCw, X, MapPin, Sparkles,
  Droplets, Navigation, ChevronDown, ChevronUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUserStore } from "@/lib/stores/use-user-store"
import {
  fetchLiveWeather,
  fetchLiveWeatherByCoords,
  type DetailedWeatherData,
  type ForecastDay
} from "@/lib/weather"

function getWeatherIcon(condition?: string, className = "h-4 w-4") {
  const c = (condition || "").toLowerCase()
  if (c.includes("rain") || c.includes("drizzle") || c.includes("shower")) {
    return <CloudRain className={`${className} text-blue-400`} />
  }
  if (c.includes("thunder") || c.includes("storm")) {
    return <CloudLightning className={`${className} text-amber-500`} />
  }
  if (c.includes("snow") || c.includes("ice")) {
    return <CloudSnow className={`${className} text-sky-300`} />
  }
  if (c.includes("overcast") || (c.includes("cloud") && !c.includes("partly") && !c.includes("mainly"))) {
    return <Cloud className={`${className} text-slate-300`} />
  }
  if (c.includes("partly") || c.includes("mainly")) {
    return <CloudSun className={`${className} text-amber-400`} />
  }
  if (c.includes("clear") || c.includes("sun")) {
    return <Sun className={`${className} text-amber-400`} />
  }
  return <Cloud className={`${className} text-slate-300`} />
}

const COMMON_CITIES = ["Bengaluru", "Lahore", "Karachi", "Dubai", "London", "New York", "Tokyo"]

export function WeatherWidget() {
  const { user, updateUser } = useUserStore()
  const [open, setOpen] = useState(false)
  const [cityInput, setCityInput] = useState(user.city || "Bengaluru")
  const [tempInput, setTempInput] = useState(user.temperature || "32°C")
  const [conditionInput, setConditionInput] = useState(user.condition || "Cloudy")
  const [unit, setUnit] = useState<"celsius" | "fahrenheit">(user.temperatureUnit || "celsius")
  const [weatherDetails, setWeatherDetails] = useState<DetailedWeatherData | null>(null)
  const [fetching, setFetching] = useState(false)
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showManualInputs, setShowManualInputs] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Sync internal state when user updates from store
  useEffect(() => {
    if (user.city) setCityInput(user.city)
    if (user.temperature) setTempInput(user.temperature)
    if (user.condition) setConditionInput(user.condition)
    if (user.temperatureUnit) setUnit(user.temperatureUnit)
  }, [user.city, user.temperature, user.condition, user.temperatureUnit])

  // Initial silent fetch to populate forecast cards when opened
  useEffect(() => {
    if (open && !weatherDetails) {
      handleFetchLive(user.city || "Bengaluru")
    }
  }, [open])

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  // Current display text
  const currentCity = user.city || "Bengaluru"
  const currentTemp = user.temperature || "32°C"
  const currentCondition = user.condition || "Cloudy"
  const displayText = user.weatherText || `${currentCity} · ${currentTemp} · ${currentCondition}`

  // Fetch live weather by city name using open-meteo
  const handleFetchLive = async (targetCity = cityInput, targetUnit = unit) => {
    setFetching(true)
    setFetchError(null)
    const res = await fetchLiveWeather(targetCity, targetUnit)
    setFetching(false)

    if (res.success && res.data) {
      setWeatherDetails(res.data)
      setCityInput(res.data.city)
      setTempInput(res.data.temperature)
      setConditionInput(res.data.condition)
    } else {
      setFetchError(res.error || "Could not fetch weather for this location")
    }
  }

  // Auto-detect location using browser Geolocation API
  const handleAutoDetectLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setFetchError("Geolocation is not supported by your browser")
      return
    }

    setDetectingLocation(true)
    setFetchError(null)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const res = await fetchLiveWeatherByCoords(latitude, longitude, unit)
        setDetectingLocation(false)
        if (res.success && res.data) {
          setWeatherDetails(res.data)
          setCityInput(res.data.city)
          setTempInput(res.data.temperature)
          setConditionInput(res.data.condition)
          
          // Auto-save the detected location immediately
          updateUser({
            city: res.data.city,
            temperature: res.data.temperature,
            condition: res.data.condition,
            weatherText: res.data.weatherText,
            temperatureUnit: unit,
          })
          setSavedSuccess(true)
          setTimeout(() => setSavedSuccess(false), 2000)
        } else {
          setFetchError(res.error || "Failed to resolve weather for current location")
        }
      },
      (err) => {
        setDetectingLocation(false)
        setFetchError(err.message || "Location permission denied")
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  // Toggle unit °C / °F
  const handleToggleUnit = (newUnit: "celsius" | "fahrenheit") => {
    setUnit(newUnit)
    handleFetchLive(cityInput, newUnit)
  }

  // Save changes to user store (persists directly to Turso Edge Database)
  const handleSave = () => {
    const formattedText = `${cityInput.trim()} · ${tempInput.trim()} · ${conditionInput.trim()}`
    updateUser({
      city: cityInput.trim(),
      temperature: tempInput.trim(),
      condition: conditionInput.trim(),
      weatherText: formattedText,
      temperatureUnit: unit,
    })
    setSavedSuccess(true)
    setTimeout(() => {
      setSavedSuccess(false)
      setOpen(false)
    }, 600)
  }

  return (
    <div className="relative" ref={popoverRef}>
      {/* ── Weather Pill (Clickable on Dashboard) ── */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="group flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted hover:text-foreground rounded-lg px-4 py-2 border transition-all duration-200 cursor-pointer shadow-sm hover:border-primary/40 hover:shadow"
        title="Click to view full forecast or edit location"
      >
        {getWeatherIcon(currentCondition, "h-4 w-4")}
        <span className="font-medium text-foreground">{displayText}</span>
        <Pencil className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors ml-1" />
      </button>

      {/* ── Google Weather Styled Popover Modal ── */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[420px] rounded-2xl border bg-card/95 backdrop-blur-xl shadow-2xl p-5 z-50 animate-in fade-in zoom-in-95 duration-150 text-foreground">
          
          {/* Top Header: Location, Auto-Detect, Close */}
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
              <div>
                <h3 className="font-semibold text-sm leading-tight flex items-center gap-1.5 truncate max-w-[200px]">
                  <span>{cityInput || "Bengaluru"}</span>
                </h3>
                <p className="text-[10px] text-muted-foreground">Turso Synced · Live Forecast</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={detectingLocation}
                onClick={handleAutoDetectLocation}
                className="h-7 px-2 text-[11px] gap-1 text-primary border-primary/30 hover:bg-primary/10"
                title="Detect my current location with GPS"
              >
                <Navigation className={`h-3 w-3 ${detectingLocation ? "animate-spin" : ""}`} />
                <span>{detectingLocation ? "Detecting..." : "GPS Detect"}</span>
              </Button>

              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Main Google Weather Hero Card ── */}
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-muted/50 via-muted/30 to-background border border-border/60 shadow-inner">
            <div className="flex items-center justify-between">
              {/* Left: Weather Icon + Temperature */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-background/80 border border-border/40 shadow-sm">
                  {getWeatherIcon(conditionInput, "h-10 w-10")}
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-bold tracking-tight font-sans">
                      {tempInput.replace(/[^0-9-]/g, "") || "32"}
                    </span>
                    <div className="flex items-center text-sm font-semibold text-muted-foreground">
                      <button
                        onClick={() => handleToggleUnit("celsius")}
                        className={`hover:text-foreground transition-colors ${unit === "celsius" ? "text-foreground font-bold" : ""}`}
                      >
                        °C
                      </button>
                      <span className="mx-0.5 text-muted-foreground/50">|</span>
                      <button
                        onClick={() => handleToggleUnit("fahrenheit")}
                        className={`hover:text-foreground transition-colors ${unit === "fahrenheit" ? "text-foreground font-bold" : ""}`}
                      >
                        °F
                      </button>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">
                    {conditionInput || "Cloudy"}
                  </p>
                </div>
              </div>

              {/* Right: Metrics matching Google Weather screenshot */}
              <div className="text-[11px] text-muted-foreground space-y-1 text-right">
                <p>
                  Precipitation: <span className="text-foreground font-medium">{weatherDetails?.precipitation ?? 10}%</span>
                </p>
                <p>
                  Humidity: <span className="text-foreground font-medium">{weatherDetails?.humidity ?? 41}%</span>
                </p>
                <p>
                  Wind: <span className="text-foreground font-medium">{weatherDetails?.windSpeed ?? "13 km/h"}</span>
                </p>
              </div>
            </div>

            {/* 7-Day Forecast Row */}
            {weatherDetails?.dailyForecast && weatherDetails.dailyForecast.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-7 gap-1 text-center">
                {weatherDetails.dailyForecast.map((day, idx) => (
                  <div
                    key={idx}
                    className={`py-1.5 px-0.5 rounded-lg flex flex-col items-center gap-1 ${
                      idx === 0 ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/40"
                    }`}
                  >
                    <span className="text-[10px] font-semibold text-muted-foreground">{day.day}</span>
                    <div className="my-0.5">
                      {getWeatherIcon(day.condition, "h-4 w-4")}
                    </div>
                    <div className="text-[10px] leading-tight">
                      <span className="font-semibold text-foreground block">{day.tempMax}</span>
                      <span className="text-muted-foreground text-[9px] block">{day.tempMin}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Location Search Bar */}
          <div className="mt-3.5 space-y-2">
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={cityInput}
                  onChange={e => setCityInput(e.target.value)}
                  placeholder="Enter city (e.g. Bengaluru, Lahore, London)..."
                  className="h-8 pl-8 text-xs bg-background/80"
                  onKeyDown={e => {
                    if (e.key === "Enter") handleFetchLive(cityInput)
                  }}
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={fetching || !cityInput.trim()}
                onClick={() => handleFetchLive(cityInput)}
                className="h-8 text-xs px-2.5 gap-1 shrink-0"
              >
                <RefreshCw className={`h-3 w-3 ${fetching ? "animate-spin" : ""}`} />
                <span>{fetching ? "Fetching..." : "Update"}</span>
              </Button>
            </div>

            {/* Quick city chips */}
            <div className="flex flex-wrap gap-1">
              {COMMON_CITIES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCityInput(c)
                    handleFetchLive(c)
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                    cityInput.toLowerCase() === c.toLowerCase()
                      ? "bg-primary text-primary-foreground border-primary font-medium"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {fetchError && (
              <p className="text-[11px] text-red-400 mt-1">{fetchError}</p>
            )}

            {/* Collapsible Manual Override toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowManualInputs(s => !s)}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <span>Manual Weather Override</span>
                {showManualInputs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {showManualInputs && (
                <div className="grid grid-cols-2 gap-2 mt-2 p-2.5 bg-muted/30 rounded-lg border border-border/40 text-xs">
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Temperature</label>
                    <Input
                      value={tempInput}
                      onChange={e => setTempInput(e.target.value)}
                      placeholder="32°C"
                      className="h-7 text-xs bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Condition</label>
                    <select
                      value={conditionInput}
                      onChange={e => setConditionInput(e.target.value)}
                      className="w-full h-7 text-xs rounded-md border border-input bg-background px-2"
                    >
                      {["Cloudy", "Clear Sky", "Partly Cloudy", "Rain", "Thunderstorm", "Snow", "Foggy"].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              {savedSuccess ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" />
                  <span>Saved to Turso!</span>
                </span>
              ) : (
                <span>Auto-saves to database</span>
              )}
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="text-xs h-8"
              >
                Done
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                className="text-xs h-8 gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Save Default</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

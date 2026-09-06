export interface ForecastDay {
  day: string
  date: string
  tempMax: string
  tempMin: string
  condition: string
  weatherCode: number
}

export interface DetailedWeatherData {
  city: string
  suburb?: string
  temperature: string
  condition: string
  weatherText: string
  weatherCode?: number
  humidity?: number
  windSpeed?: string
  precipitation?: number
  dailyForecast?: ForecastDay[]
}

// WMO Weather interpretation codes (WW)
export function getWeatherConditionFromCode(code: number): { condition: string; iconType: "sun" | "cloud-sun" | "cloud" | "rain" | "snow" | "thunder" } {
  switch (code) {
    case 0:
      return { condition: "Clear Sky", iconType: "sun" }
    case 1:
      return { condition: "Mainly Clear", iconType: "cloud-sun" }
    case 2:
      return { condition: "Partly Cloudy", iconType: "cloud-sun" }
    case 3:
      return { condition: "Cloudy", iconType: "cloud" }
    case 45:
    case 48:
      return { condition: "Foggy", iconType: "cloud" }
    case 51:
    case 53:
    case 55:
      return { condition: "Drizzle", iconType: "rain" }
    case 61:
    case 63:
    case 65:
      return { condition: "Rain", iconType: "rain" }
    case 71:
    case 73:
    case 75:
    case 77:
      return { condition: "Snow", iconType: "snow" }
    case 80:
    case 81:
    case 82:
      return { condition: "Rain Showers", iconType: "rain" }
    case 95:
    case 96:
    case 99:
      return { condition: "Thunderstorm", iconType: "thunder" }
    default:
      return { condition: "Cloudy", iconType: "cloud" }
  }
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/**
 * Parses forecast details from Open-Meteo payload
 */
function parseOpenMeteoPayload(
  resolvedCity: string,
  weatherJson: any,
  unit: "celsius" | "fahrenheit" = "celsius"
): DetailedWeatherData {
  const current = weatherJson.current_weather || {}
  const tempRounded = Math.round(current.temperature ?? 32)
  const unitSymbol = unit === "fahrenheit" ? "°F" : "°C"
  const { condition } = getWeatherConditionFromCode(current.weathercode ?? 3)

  // Humidity & precipitation from hourly if present
  let humidity: number | undefined
  let precipitation: number | undefined
  if (weatherJson.hourly?.relativehumidity_2m?.length > 0) {
    humidity = Math.round(weatherJson.hourly.relativehumidity_2m[0])
  }
  if (weatherJson.hourly?.precipitation_probability?.length > 0) {
    precipitation = Math.round(weatherJson.hourly.precipitation_probability[0])
  }

  const windSpeed = current.windspeed ? `${Math.round(current.windspeed)} km/h` : "12 km/h"

  // 7-day forecast parsing
  const dailyForecast: ForecastDay[] = []
  if (weatherJson.daily?.time) {
    const times: string[] = weatherJson.daily.time
    const maxTemps: number[] = weatherJson.daily.temperature_2m_max || []
    const minTemps: number[] = weatherJson.daily.temperature_2m_min || []
    const codes: number[] = weatherJson.daily.weathercode || []

    for (let i = 0; i < Math.min(times.length, 7); i++) {
      const d = new Date(times[i])
      const dayName = DAY_NAMES[d.getDay()]
      const { condition: dayCond } = getWeatherConditionFromCode(codes[i] ?? 2)
      dailyForecast.push({
        day: i === 0 ? "Today" : dayName,
        date: times[i],
        tempMax: `${Math.round(maxTemps[i] ?? tempRounded)}${unitSymbol}`,
        tempMin: `${Math.round(minTemps[i] ?? (tempRounded - 10))}${unitSymbol}`,
        condition: dayCond,
        weatherCode: codes[i] ?? 2,
      })
    }
  }

  const weatherText = `${resolvedCity} · ${tempRounded}${unitSymbol} · ${condition}`

  return {
    city: resolvedCity,
    temperature: `${tempRounded}${unitSymbol}`,
    condition,
    weatherText,
    weatherCode: current.weathercode,
    humidity: humidity ?? 41,
    windSpeed,
    precipitation: precipitation ?? 10,
    dailyForecast,
  }
}

/**
 * Fetches live weather for any coordinates (lat, lon)
 */
export async function fetchLiveWeatherByCoords(
  latitude: number,
  longitude: number,
  unit: "celsius" | "fahrenheit" = "celsius"
): Promise<{ success: boolean; data?: DetailedWeatherData; error?: string }> {
  try {
    // 1. Reverse geocode coordinates to find city name
    let resolvedCity = "Bengaluru"
    try {
      const geoRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      )
      if (geoRes.ok) {
        const geo = await geoRes.json()
        resolvedCity = geo.city || geo.locality || geo.principalSubdivision || "Bengaluru"
      }
    } catch {
      resolvedCity = "Current Location"
    }

    // 2. Fetch full Open-Meteo forecast (current + daily 7-day + hourly humidity/precipitation)
    const tempParam = unit === "fahrenheit" ? "&temperature_unit=fahrenheit" : ""
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&hourly=relativehumidity_2m,precipitation_probability,windspeed_10m&timezone=auto${tempParam}`
    
    const weatherRes = await fetch(weatherUrl)
    if (!weatherRes.ok) {
      return { success: false, error: "Weather forecast service unavailable" }
    }

    const weatherJson = await weatherRes.json()
    const data = parseOpenMeteoPayload(resolvedCity, weatherJson, unit)
    return { success: true, data }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch weather by coordinates"
    return { success: false, error: msg }
  }
}

/**
 * Fetches live weather for any city name worldwide using Open-Meteo free API
 */
export async function fetchLiveWeather(
  cityQuery: string,
  unit: "celsius" | "fahrenheit" = "celsius"
): Promise<{ success: boolean; data?: DetailedWeatherData; error?: string }> {
  try {
    if (!cityQuery || !cityQuery.trim()) {
      return { success: false, error: "Please enter a city name" }
    }

    // 1. Geocode city name
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery.trim())}&count=1`
    const geoRes = await fetch(geoUrl)
    if (!geoRes.ok) {
      return { success: false, error: "Geocoding service unavailable" }
    }
    const geoData = await geoRes.json()
    if (!geoData.results || geoData.results.length === 0) {
      return { success: false, error: `City "${cityQuery}" not found` }
    }

    const { name: resolvedName, latitude, longitude } = geoData.results[0]

    // 2. Fetch current weather forecast with full daily & hourly stats
    const tempParam = unit === "fahrenheit" ? "&temperature_unit=fahrenheit" : ""
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&hourly=relativehumidity_2m,precipitation_probability,windspeed_10m&timezone=auto${tempParam}`
    
    const weatherRes = await fetch(weatherUrl)
    if (!weatherRes.ok) {
      return { success: false, error: "Weather forecast service unavailable" }
    }

    const weatherJson = await weatherRes.json()
    const data = parseOpenMeteoPayload(resolvedName, weatherJson, unit)
    return { success: true, data }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch weather"
    return { success: false, error: message }
  }
}

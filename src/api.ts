export type Lang = 'ru' | 'en';

export type Place = {
  id: number;
  name: string;
  country: string;
  admin?: string;
  lat: number;
  lon: number;
};

export type Scene = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

export type Forecast = {
  utcOffset: number; // seconds
  current: {
    time: string;
    temp: number;
    feels: number;
    humidity: number;
    isDay: boolean;
    code: number;
    wind: number;
    windDir: number;
    pressure: number;
    precipitation: number;
  };
  hourly: { time: string; temp: number; code: number; pop: number; isDay: boolean }[];
  daily: { date: string; code: number; max: number; min: number; pop: number; sunrise: string; sunset: string; uv: number }[];
};

const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST = 'https://api.open-meteo.com/v1/forecast';

export async function searchPlaces(query: string, lang: Lang, signal?: AbortSignal): Promise<Place[]> {
  const url = `${GEO}?name=${encodeURIComponent(query)}&count=6&language=${lang}&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`geocoding ${res.status}`);
  const data = await res.json();
  return (data.results ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as number,
    name: r.name as string,
    country: (r.country as string) ?? '',
    admin: r.admin1 as string | undefined,
    lat: r.latitude as number,
    lon: r.longitude as number,
  }));
}

export async function getForecast(lat: number, lon: number, signal?: AbortSignal): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone: 'auto',
    forecast_days: '7',
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl,precipitation',
    hourly: 'temperature_2m,weather_code,precipitation_probability,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max',
  });
  const res = await fetch(`${FORECAST}?${params}`, { signal });
  if (!res.ok) throw new Error(`forecast ${res.status}`);
  const d = await res.json();

  // keep the next 24 hours starting from the current local hour
  const nowHour = (d.current.time as string).slice(0, 13);
  const start = Math.max(0, (d.hourly.time as string[]).findIndex((t) => t.slice(0, 13) === nowHour));

  return {
    utcOffset: d.utc_offset_seconds,
    current: {
      time: d.current.time,
      temp: d.current.temperature_2m,
      feels: d.current.apparent_temperature,
      humidity: d.current.relative_humidity_2m,
      isDay: d.current.is_day === 1,
      code: d.current.weather_code,
      wind: d.current.wind_speed_10m,
      windDir: d.current.wind_direction_10m,
      pressure: d.current.pressure_msl,
      precipitation: d.current.precipitation,
    },
    hourly: (d.hourly.time as string[]).slice(start, start + 24).map((time, i) => ({
      time,
      temp: d.hourly.temperature_2m[start + i],
      code: d.hourly.weather_code[start + i],
      pop: d.hourly.precipitation_probability[start + i] ?? 0,
      isDay: d.hourly.is_day[start + i] === 1,
    })),
    daily: (d.daily.time as string[]).map((date, i) => ({
      date,
      code: d.daily.weather_code[i],
      max: d.daily.temperature_2m_max[i],
      min: d.daily.temperature_2m_min[i],
      pop: d.daily.precipitation_probability_max[i] ?? 0,
      sunrise: d.daily.sunrise[i],
      sunset: d.daily.sunset[i],
      uv: d.daily.uv_index_max[i] ?? 0,
    })),
  };
}

/** WMO weather interpretation codes → visual scene */
export function sceneOf(code: number): Scene {
  if (code === 0) return 'clear';
  if (code <= 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'cloudy';
}

export const toF = (c: number) => (c * 9) / 5 + 32;
export const toMph = (kmh: number) => kmh * 0.621371;

/** Re-fetch a place by id so its name matches the current UI language. */
export async function localizePlace(place: Place, lang: Lang, signal?: AbortSignal): Promise<Place> {
  if (!place.id) return place;
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/get?id=${place.id}&language=${lang}`, { signal });
  if (!res.ok) return place;
  const r = await res.json();
  return { ...place, name: r.name ?? place.name, country: r.country ?? place.country, admin: r.admin1 ?? place.admin };
}

export type Mini = { temp: number; code: number; isDay: boolean };

/** Current conditions for several places in a single request (the API accepts coordinate lists). */
export async function getMini(places: Place[], signal?: AbortSignal): Promise<Mini[]> {
  if (!places.length) return [];
  const lat = places.map((p) => p.lat).join(',');
  const lon = places.map((p) => p.lon).join(',');
  const res = await fetch(`${FORECAST}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day`, { signal });
  if (!res.ok) throw new Error(`mini ${res.status}`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : [data];
  return list.map((d: { current: { temperature_2m: number; weather_code: number; is_day: number } }) => ({
    temp: d.current.temperature_2m,
    code: d.current.weather_code,
    isDay: d.current.is_day === 1,
  }));
}

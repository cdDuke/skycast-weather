import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang, Scene } from './api';

const dict = {
  ru: {
    title: 'SkyCast — погода, которую приятно смотреть',
    search: 'Найти город…',
    searchAria: 'Поиск города',
    noCities: 'Город не найден',
    myLocation: 'Моё местоположение',
    locating: 'Определяем…',
    geoDenied: 'Доступ к геолокации запрещён — выберите город вручную.',
    geoUnavailable: 'Геолокация недоступна в этом браузере.',
    unknownPlace: 'Моё местоположение',
    feels: 'Ощущается как {t}',
    hilo: 'Макс. {max} · Мин. {min}',
    localTime: 'Местное время {time}',
    hourly: 'Почасовой прогноз',
    daily: 'Прогноз на 7 дней',
    now: 'Сейчас',
    today: 'Сегодня',
    wind: 'Ветер',
    humidity: 'Влажность',
    uv: 'УФ-индекс',
    pressure: 'Давление',
    sun: 'Солнце',
    precip: 'Осадки',
    sunrise: 'Восход',
    sunset: 'Закат',
    'uv.low': 'Низкий',
    'uv.moderate': 'Умеренный',
    'uv.high': 'Высокий',
    'uv.veryHigh': 'Очень высокий',
    'hum.dry': 'Сухо',
    'hum.ok': 'Комфортно',
    'hum.wet': 'Влажно',
    kmh: 'км/ч',
    mph: 'миль/ч',
    hpa: 'гПа',
    mm: 'мм',
    popShort: 'Вер. осадков',
    favorites: 'Избранные города',
    addFav: 'Добавить в избранное',
    removeFav: 'Убрать из избранного',
    retry: 'Повторить',
    error: 'Не удалось загрузить прогноз. Проверьте подключение к интернету.',
    loading: 'Загружаем прогноз…',
    units: 'Единицы измерения',
    source: 'Данные: Open-Meteo.com · проект для портфолио',
    'dir.N': 'С',
    'dir.NE': 'СВ',
    'dir.E': 'В',
    'dir.SE': 'ЮВ',
    'dir.S': 'Ю',
    'dir.SW': 'ЮЗ',
    'dir.W': 'З',
    'dir.NW': 'СЗ',
    'scene.clear': 'Ясно',
    'scene.partly': 'Переменная облачность',
    'scene.cloudy': 'Пасмурно',
    'scene.fog': 'Туман',
    'scene.drizzle': 'Морось',
    'scene.rain': 'Дождь',
    'scene.snow': 'Снег',
    'scene.storm': 'Гроза',
  },
  en: {
    title: 'SkyCast — weather that feels good to look at',
    search: 'Search city…',
    searchAria: 'Search for a city',
    noCities: 'No city found',
    myLocation: 'My location',
    locating: 'Locating…',
    geoDenied: 'Location access was denied — pick a city manually.',
    geoUnavailable: 'Geolocation is not available in this browser.',
    unknownPlace: 'My location',
    feels: 'Feels like {t}',
    hilo: 'H {max} · L {min}',
    localTime: 'Local time {time}',
    hourly: 'Hourly forecast',
    daily: '7-day forecast',
    now: 'Now',
    today: 'Today',
    wind: 'Wind',
    humidity: 'Humidity',
    uv: 'UV index',
    pressure: 'Pressure',
    sun: 'Sun',
    precip: 'Precipitation',
    sunrise: 'Sunrise',
    sunset: 'Sunset',
    'uv.low': 'Low',
    'uv.moderate': 'Moderate',
    'uv.high': 'High',
    'uv.veryHigh': 'Very high',
    'hum.dry': 'Dry',
    'hum.ok': 'Comfortable',
    'hum.wet': 'Humid',
    kmh: 'km/h',
    mph: 'mph',
    hpa: 'hPa',
    mm: 'mm',
    popShort: 'Chance of rain',
    favorites: 'Saved cities',
    addFav: 'Save city',
    removeFav: 'Remove city',
    retry: 'Try again',
    error: 'Could not load the forecast. Please check your connection.',
    loading: 'Loading forecast…',
    units: 'Units',
    source: 'Data: Open-Meteo.com · portfolio project',
    'dir.N': 'N',
    'dir.NE': 'NE',
    'dir.E': 'E',
    'dir.SE': 'SE',
    'dir.S': 'S',
    'dir.SW': 'SW',
    'dir.W': 'W',
    'dir.NW': 'NW',
    'scene.clear': 'Clear',
    'scene.partly': 'Partly cloudy',
    'scene.cloudy': 'Overcast',
    'scene.fog': 'Fog',
    'scene.drizzle': 'Drizzle',
    'scene.rain': 'Rain',
    'scene.snow': 'Snow',
    'scene.storm': 'Thunderstorm',
  },
} satisfies Record<Lang, Record<string, string>>;

export type Key = keyof (typeof dict)['ru'];

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Key, vars?: Record<string, string | number>) => string;
  locale: string;
  sceneName: (s: Scene) => string;
};

const I18n = createContext<Ctx | null>(null);

const readLang = (): Lang => {
  try {
    const v = localStorage.getItem('lang');
    if (v === 'ru' || v === 'en') return v;
  } catch {
    /* blocked */
  }
  return 'ru';
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('lang', l);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = dict[lang].title;
  }, [lang]);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang,
      locale: lang === 'ru' ? 'ru-RU' : 'en-GB',
      t: (key, vars = {}) => dict[lang][key].replace(/\{(\w+)\}/g, (_, v: string) => String(vars[v] ?? '')),
      sceneName: (s) => dict[lang][`scene.${s}`],
    }),
    [lang, setLang]
  );
  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18n);
  if (!ctx) throw new Error('useI18n outside provider');
  return ctx;
}

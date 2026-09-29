import { useCallback, useEffect, useState } from 'react';
import { getForecast, getMini, localizePlace, sceneOf, toF, type Forecast, type Mini, type Place } from './api';
import { useI18n } from './i18n';
import { useLocalStorage } from './useLocalStorage';
import Sky from './components/Sky';
import Search from './components/Search';
import WeatherIcon from './components/WeatherIcon';
import { Current, Daily, Details, Hourly, type Units } from './components/Panels';

const MOSCOW: Place = { id: 524901, name: 'Москва', country: 'Россия', admin: 'Москва', lat: 55.75204, lon: 37.61781 };
const DEFAULT_FAVS: Place[] = [
  { id: 498817, name: 'Санкт-Петербург', country: 'Россия', admin: 'Санкт-Петербург', lat: 59.93863, lon: 30.31413 },
  { id: 1850147, name: 'Токио', country: 'Япония', admin: 'Токио', lat: 35.6895, lon: 139.69171 },
  { id: 5128581, name: 'Нью-Йорк', country: 'США', admin: 'Нью-Йорк', lat: 40.71427, lon: -74.00597 },
];

type Status = 'loading' | 'ready' | 'error';

export default function App() {
  const { t, lang, setLang } = useI18n();
  const [place, setPlace] = useLocalStorage<Place>('skycast-place', MOSCOW);
  const [favs, setFavs] = useLocalStorage<Place[]>('skycast-favs', DEFAULT_FAVS);
  const [units, setUnits] = useLocalStorage<Units>('skycast-units', 'c');
  const [data, setData] = useState<Forecast | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [minis, setMinis] = useState<Record<number, Mini>>({});
  const [geoMsg, setGeoMsg] = useState('');
  const [locating, setLocating] = useState(false);
  const [reload, setReload] = useState(0);

  // forecast for the selected place
  useEffect(() => {
    const ctrl = new AbortController();
    setStatus('loading');
    getForecast(place.lat, place.lon, ctrl.signal)
      .then((d) => {
        setData(d);
        setStatus('ready');
      })
      .catch((e: Error) => e.name !== 'AbortError' && setStatus('error'));
    return () => ctrl.abort();
  }, [place.lat, place.lon, reload]);

  // quick conditions for saved cities (one request for all of them)
  useEffect(() => {
    const ctrl = new AbortController();
    getMini(favs, ctrl.signal)
      .then((list) => setMinis(Object.fromEntries(list.map((m, i) => [favs[i].id, m]))))
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [favs]);

  // translate place names when the UI language changes
  useEffect(() => {
    const ctrl = new AbortController();
    localizePlace(place, lang, ctrl.signal)
      .then((p) => p.name !== place.name && setPlace(p))
      .catch(() => undefined);
    Promise.all(favs.map((f) => localizePlace(f, lang, ctrl.signal)))
      .then((list) => list.some((p, i) => p.name !== favs[i].name) && setFavs(list))
      .catch(() => undefined);
    return () => ctrl.abort();
    // only re-run on language change
  }, [lang]);

  const isFav = favs.some((f) => f.id === place.id && f.lat === place.lat);
  const toggleFav = () =>
    setFavs(isFav ? favs.filter((f) => !(f.id === place.id && f.lat === place.lat)) : [...favs, place].slice(-8));

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) return setGeoMsg(t('geoUnavailable'));
    setLocating(true);
    setGeoMsg('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setPlace({ id: 0, name: t('unknownPlace'), country: '', lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {
        setLocating(false);
        setGeoMsg(t('geoDenied'));
      },
      { timeout: 10000, maximumAge: 600_000 }
    );
  }, [setPlace, t]);

  const scene = data ? sceneOf(data.current.code) : 'partly';
  const isDay = data ? data.current.isDay : true;

  return (
    <>
      <Sky scene={scene} isDay={isDay} />
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <WeatherIcon scene="partly" size={34} />
            SkyCast
          </div>
          <Search onPick={setPlace} />
          <div className="topbar__actions">
            <button className="pill-btn" onClick={locate} disabled={locating} aria-label={t('myLocation')} title={t('myLocation')}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </svg>
              <span className="hide-sm">{locating ? t('locating') : t('myLocation')}</span>
            </button>
            <div className="seg" role="group" aria-label={t('units')}>
              {(['c', 'f'] as Units[]).map((u) => (
                <button key={u} className={units === u ? 'is-active' : ''} aria-pressed={units === u} onClick={() => setUnits(u)}>
                  °{u.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="seg" role="group" aria-label="Language">
              {(['ru', 'en'] as const).map((l) => (
                <button key={l} className={lang === l ? 'is-active' : ''} aria-pressed={lang === l} onClick={() => setLang(l)}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </header>

        {geoMsg && (
          <p className="notice" role="alert">
            {geoMsg}
          </p>
        )}

        {favs.length > 0 && (
          <nav className="favs" aria-label={t('favorites')}>
            {favs.map((f) => {
              const m = minis[f.id];
              const active = f.id === place.id && f.lat === place.lat;
              return (
                <button key={`${f.id}-${f.lat}`} className={`fav${active ? ' is-active' : ''}`} onClick={() => setPlace(f)} aria-current={active ? 'true' : undefined}>
                  {m && <WeatherIcon scene={sceneOf(m.code)} isDay={m.isDay} size={22} />}
                  <span>{f.name}</span>
                  {m && <strong>{Math.round(units === 'f' ? toF(m.temp) : m.temp)}°</strong>}
                </button>
              );
            })}
          </nav>
        )}

        {status === 'error' && (
          <div className="state glass" role="alert">
            <p>{t('error')}</p>
            <button className="pill-btn" onClick={() => setReload((n) => n + 1)}>
              {t('retry')}
            </button>
          </div>
        )}

        {status !== 'error' && !data && (
          <div className="grid" aria-busy="true" aria-label={t('loading')}>
            <div className="skeleton skeleton--current" />
            <div className="skeleton skeleton--details" />
            <div className="skeleton skeleton--hourly" />
            <div className="skeleton skeleton--daily" />
          </div>
        )}

        {data && status !== 'error' && (
          <main className={`grid${status === 'loading' ? ' is-refreshing' : ''}`}>
            <Current place={place.id ? place : { ...place, name: t('unknownPlace') }} data={data} units={units} fav={isFav} onFav={toggleFav} />
            <Details data={data} units={units} />
            <Hourly data={data} units={units} />
            <Daily data={data} units={units} />
          </main>
        )}

        <footer className="footer">{t('source')}</footer>
      </div>
    </>
  );
}

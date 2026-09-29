import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { sceneOf, toF, toMph, type Forecast, type Place } from '../api';
import { useI18n } from '../i18n';
import WeatherIcon from './WeatherIcon';

export type Units = 'c' | 'f';
const temp = (c: number, u: Units) => `${Math.round(u === 'f' ? toF(c) : c)}°`;
const hhmm = (iso: string) => iso.slice(11, 16);

/** Current wall-clock time at the forecast location (API gives its UTC offset). */
function useLocalClock(utcOffset: number) {
  const [now, setNow] = useState(() => new Date(Date.now() + utcOffset * 1000));
  useEffect(() => {
    setNow(new Date(Date.now() + utcOffset * 1000));
    const id = setInterval(() => setNow(new Date(Date.now() + utcOffset * 1000)), 30_000);
    return () => clearInterval(id);
  }, [utcOffset]);
  return now; // read with getUTC* methods
}

/** Smoothly counts to a new number when the value changes. */
function useTween(value: number, ms = 700) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    const from = shown;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(from + (value - from) * eased);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}

type Props = { place: Place; data: Forecast; units: Units; fav: boolean; onFav: () => void };

export function Current({ place, data, units, fav, onFav }: Props) {
  const { t, sceneName } = useI18n();
  const clock = useLocalClock(data.utcOffset);
  const c = data.current;
  const scene = sceneOf(c.code);
  const shown = useTween(units === 'f' ? toF(c.temp) : c.temp);
  const today = data.daily[0];
  const time = `${String(clock.getUTCHours()).padStart(2, '0')}:${String(clock.getUTCMinutes()).padStart(2, '0')}`;

  return (
    <section className="current glass" aria-live="polite">
      <div className="current__top">
        <div>
          <h1 className="current__city">{place.name}</h1>
          <p className="current__meta">
            {[place.admin, place.country].filter(Boolean).join(', ')} · {t('localTime', { time })}
          </p>
        </div>
        <button className={`star${fav ? ' is-on' : ''}`} onClick={onFav} aria-pressed={fav} aria-label={fav ? t('removeFav') : t('addFav')}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.3L12 17.5l-5.5 2.9 1-6.3L3 9.7l6.2-.9Z" />
          </svg>
        </button>
      </div>
      <div className="current__main">
        <WeatherIcon scene={scene} isDay={c.isDay} size={120} />
        <p className="current__temp">
          {Math.round(shown)}
          <span>°{units === 'f' ? 'F' : 'C'}</span>
        </p>
      </div>
      <p className="current__cond">{sceneName(scene)}</p>
      <p className="current__sub">
        {t('feels', { t: temp(c.feels, units) })} · {t('hilo', { max: temp(today.max, units), min: temp(today.min, units) })}
      </p>
    </section>
  );
}

const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export function Details({ data, units }: { data: Forecast; units: Units }) {
  const { t, lang } = useI18n();
  const c = data.current;
  const today = data.daily[0];
  const dir = DIRS[Math.round(c.windDir / 45) % 8];
  const wind = units === 'f' ? `${Math.round(toMph(c.wind))} ${t('mph')}` : `${Math.round(c.wind)} ${t('kmh')}`;
  const uvLevel = today.uv < 3 ? 'uv.low' : today.uv < 6 ? 'uv.moderate' : today.uv < 8 ? 'uv.high' : 'uv.veryHigh';
  const humLevel = c.humidity < 35 ? 'hum.dry' : c.humidity < 70 ? 'hum.ok' : 'hum.wet';
  const pressure = lang === 'ru' ? `${Math.round(c.pressure * 0.750062)} мм рт. ст.` : `${Math.round(c.pressure)} ${t('hpa')}`;

  // sun position along today's arc
  const local = new Date(Date.now() + data.utcOffset * 1000).toISOString().slice(0, 16);
  const toMin = (iso: string) => Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
  const k = Math.min(1, Math.max(0, (toMin(local) - toMin(today.sunrise)) / (toMin(today.sunset) - toMin(today.sunrise))));
  const angle = Math.PI * (1 - k);
  const sunX = 50 + Math.cos(angle) * 40;
  const sunY = 46 - Math.sin(angle) * 36;

  return (
    <section className="details">
      <article className="tile glass">
        <h3>{t('wind')}</h3>
        <div className="tile__row">
          <svg className="compass" viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="2" />
            <text x="32" y="12" textAnchor="middle">{t('dir.N')}</text>
            <g transform={`rotate(${c.windDir + 180} 32 32)`}>
              <path d="M32 7 37 32H27Z" fill="#7cc4ff" />
              <path d="M32 57 27 32h10Z" fill="currentColor" opacity=".35" />
              <circle cx="32" cy="32" r="3" fill="#fff" />
            </g>
          </svg>
          <div>
            <strong>{wind}</strong>
            <span>
              {t(`dir.${dir}`)} · {Math.round(c.windDir)}°
            </span>
          </div>
        </div>
      </article>

      <article className="tile glass">
        <h3>{t('humidity')}</h3>
        <strong className="tile__big">{Math.round(c.humidity)}%</strong>
        <div className="meter">
          <span style={{ width: `${c.humidity}%` }} />
        </div>
        <span>{t(humLevel)}</span>
      </article>

      <article className="tile glass">
        <h3>{t('uv')}</h3>
        <strong className="tile__big">{Math.round(today.uv)}</strong>
        <div className="meter meter--uv">
          <i style={{ left: `${Math.min(100, (today.uv / 11) * 100)}%` }} />
        </div>
        <span>{t(uvLevel)}</span>
      </article>

      <article className="tile glass">
        <h3>{t('pressure')}</h3>
        <strong className="tile__big tile__big--sm">{pressure}</strong>
        <span>
          {t('precip')}: {c.precipitation} {t('mm')} · {today.pop}%
        </span>
      </article>

      <article className="tile glass tile--wide">
        <h3>{t('sun')}</h3>
        <svg className="sunarc" viewBox="0 0 100 52" aria-hidden="true">
          <path d="M10 46a40 36 0 0 1 80 0" fill="none" stroke="currentColor" strokeOpacity=".25" strokeDasharray="2 3" />
          <line x1="4" y1="46" x2="96" y2="46" stroke="currentColor" strokeOpacity=".25" />
          <circle cx={sunX} cy={sunY} r="5" fill="#ffd25e" />
        </svg>
        <div className="tile__row tile__row--split">
          <span>
            {t('sunrise')} <strong>{hhmm(today.sunrise)}</strong>
          </span>
          <span>
            {t('sunset')} <strong>{hhmm(today.sunset)}</strong>
          </span>
        </div>
      </article>
    </section>
  );
}

export function Hourly({ data, units }: { data: Forecast; units: Units }) {
  const { t } = useI18n();
  const COL = 64;
  const H = 70;
  const temps = data.hourly.map((h) => (units === 'f' ? toF(h.temp) : h.temp));
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const y = (v: number) => 10 + (1 - (v - min) / Math.max(1, max - min)) * (H - 20);

  const path = useMemo(
    () =>
      temps
        .map((v, i) => {
          const x = i * COL + COL / 2;
          if (i === 0) return `M${x},${y(v)}`;
          const px = (i - 1) * COL + COL / 2;
          const cx = (px + x) / 2;
          return `C${cx},${y(temps[i - 1])} ${cx},${y(v)} ${x},${y(v)}`;
        })
        .join(' '),
    [data, units]
  );

  return (
    <section className="hourly glass">
      <h2 className="panel__title">{t('hourly')}</h2>
      <div className="hourly__scroll" tabIndex={0} aria-label={t('hourly')}>
        <div className="hourly__track" style={{ width: data.hourly.length * COL }}>
          <svg className="hourly__chart" width={data.hourly.length * COL} height={H} aria-hidden="true">
            <defs>
              <linearGradient id="hfill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#ffd25e" stopOpacity=".35" />
                <stop offset="1" stopColor="#ffd25e" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${path} L${data.hourly.length * COL - COL / 2},${H} L${COL / 2},${H}Z`} fill="url(#hfill)" />
            <path d={path} fill="none" stroke="#ffd25e" strokeWidth="2.5" strokeLinecap="round" />
            {temps.map((v, i) => (
              <circle key={i} cx={i * COL + COL / 2} cy={y(v)} r={i === 0 ? 4.5 : 2.5} fill={i === 0 ? '#fff' : '#ffd25e'} />
            ))}
          </svg>
          <ol className="hourly__cols">
            {data.hourly.map((h, i) => (
              <li key={h.time} style={{ width: COL }}>
                <strong>{temp(h.temp, units)}</strong>
                <WeatherIcon scene={sceneOf(h.code)} isDay={h.isDay} size={30} />
                <span className="hourly__pop" style={{ '--p': `${h.pop}%` } as CSSProperties} title={`${t('popShort')}: ${h.pop}%`}>
                  {h.pop >= 10 ? `${h.pop}%` : ''}
                </span>
                <span className="hourly__time">{i === 0 ? t('now') : hhmm(h.time)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function Daily({ data, units }: { data: Forecast; units: Units }) {
  const { t, locale } = useI18n();
  const weekMin = Math.min(...data.daily.map((d) => d.min));
  const weekMax = Math.max(...data.daily.map((d) => d.max));
  const span = Math.max(1, weekMax - weekMin);
  const pct = (v: number) => ((v - weekMin) / span) * 100;
  const dayName = (iso: string, i: number) => {
    if (i === 0) return t('today');
    const [yy, mm, dd] = iso.split('-').map(Number);
    return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(yy, mm - 1, dd)));
  };

  return (
    <section className="daily glass">
      <h2 className="panel__title">{t('daily')}</h2>
      <ol className="daily__list">
        {data.daily.map((d, i) => (
          <li key={d.date}>
            <span className="daily__day">{dayName(d.date, i)}</span>
            <span className="daily__icon">
              <WeatherIcon scene={sceneOf(d.code)} size={32} />
              {d.pop >= 20 && <small>{d.pop}%</small>}
            </span>
            <span className="daily__min">{temp(d.min, units)}</span>
            <span className="range" aria-hidden="true">
              <span className="range__fill" style={{ left: `${pct(d.min)}%`, right: `${100 - pct(d.max)}%` }} />
              {i === 0 && <i className="range__now" style={{ left: `${pct(data.current.temp)}%` }} />}
            </span>
            <span className="daily__max">{temp(d.max, units)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

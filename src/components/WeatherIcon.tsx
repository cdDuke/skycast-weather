import type { Scene } from '../api';

const Sun = ({ small }: { small?: boolean }) => (
  <g className="wi-sun">
    <circle cx="32" cy="32" r={small ? 9 : 11} fill="#ffd25e" />
    <g className="wi-rays" stroke="#ffd25e" strokeWidth="3" strokeLinecap="round">
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        const r1 = small ? 14 : 17;
        const r2 = small ? 19 : 23;
        return <line key={i} x1={32 + Math.cos(a) * r1} y1={32 + Math.sin(a) * r1} x2={32 + Math.cos(a) * r2} y2={32 + Math.sin(a) * r2} />;
      })}
    </g>
  </g>
);

const Moon = () => <path className="wi-moon" d="M40 14a18 18 0 1 0 12 30A15 15 0 0 1 40 14Z" fill="#e8ecff" />;

const Cloud = ({ dark, className = 'wi-cloud', dy = 0 }: { dark?: boolean; className?: string; dy?: number }) => (
  <path
    className={className}
    transform={`translate(0 ${dy})`}
    d="M20 50h26a10 10 0 0 0 1-20 14 14 0 0 0-27-3 9 9 0 0 0 0 23Z"
    fill={dark ? '#9aa6bd' : '#f4f7ff'}
  />
);

export default function WeatherIcon({ scene, isDay = true, size = 64 }: { scene: Scene; isDay?: boolean; size?: number }) {
  return (
    <svg className={`wi wi--${scene}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {scene === 'clear' && (isDay ? <Sun /> : <Moon />)}
      {scene === 'partly' && (
        <>
          <g transform="translate(-8 -8)">{isDay ? <Sun small /> : <Moon />}</g>
          <Cloud />
        </>
      )}
      {scene === 'cloudy' && (
        <>
          <Cloud dark className="wi-cloud wi-cloud--back" dy={-8} />
          <Cloud />
        </>
      )}
      {scene === 'fog' && (
        <>
          <Cloud dark dy={-6} />
          <g stroke="#cfd6e6" strokeWidth="3" strokeLinecap="round" className="wi-fog">
            <line x1="14" y1="52" x2="44" y2="52" />
            <line x1="20" y1="58" x2="50" y2="58" />
          </g>
        </>
      )}
      {(scene === 'drizzle' || scene === 'rain' || scene === 'storm') && (
        <>
          <Cloud dark={scene !== 'drizzle'} dy={-8} />
          {scene === 'storm' && <path className="wi-bolt" d="M34 42 26 54h7l-3 9 10-13h-7l4-8Z" fill="#ffd25e" />}
          <g stroke="#7cc4ff" strokeWidth="2.6" strokeLinecap="round" className="wi-drops">
            {(scene === 'drizzle' ? [22, 34, 46] : [20, 30, 40, 50]).map((x, i) => (
              <line key={x} x1={x} y1={48} x2={x - 3} y2={56} style={{ animationDelay: `${i * 0.18}s` }} />
            ))}
          </g>
        </>
      )}
      {scene === 'snow' && (
        <>
          <Cloud dy={-8} />
          <g fill="#fff" className="wi-flakes">
            {[20, 32, 44].map((x, i) => (
              <circle key={x} cx={x} cy={52} r="2.6" style={{ animationDelay: `${i * 0.3}s` }} />
            ))}
          </g>
        </>
      )}
    </svg>
  );
}

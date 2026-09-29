import { useEffect, useRef } from 'react';
import type { Scene } from '../api';

type Particle = { x: number; y: number; vx: number; vy: number; len: number; r: number; a: number };

/** Full-screen animated backdrop: gradient + drifting clouds + canvas precipitation. */
export default function Sky({ scene, isDay }: { scene: Scene; isDay: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const kind = scene === 'snow' ? 'snow' : scene === 'rain' || scene === 'storm' ? 'rain' : scene === 'drizzle' ? 'drizzle' : null;
    let raf = 0;
    let w = 0;
    let h = 0;
    let particles: Particle[] = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const spawn = (anywhere: boolean): Particle => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : -20,
      vx: kind === 'snow' ? (Math.random() - 0.5) * 0.6 : -1.2,
      vy: kind === 'snow' ? 0.6 + Math.random() * 1.2 : kind === 'drizzle' ? 6 + Math.random() * 3 : 12 + Math.random() * 8,
      len: kind === 'drizzle' ? 6 + Math.random() * 6 : 12 + Math.random() * 14,
      r: 1 + Math.random() * 2.4,
      a: 0.25 + Math.random() * 0.5,
    });

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const density = kind === 'snow' ? 0.00018 : kind === 'drizzle' ? 0.00012 : 0.00032;
      particles = kind ? Array.from({ length: Math.round(w * h * density) }, () => spawn(true)) : [];
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        if (kind === 'snow') {
          ctx.beginPath();
          ctx.fillStyle = `rgba(255,255,255,${p.a + 0.2})`;
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          p.x += p.vx + Math.sin(p.y / 40) * 0.3;
        } else {
          ctx.strokeStyle = `rgba(190,220,255,${p.a})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 1.5, p.y + p.len);
          ctx.stroke();
          p.x += p.vx;
        }
        p.y += p.vy;
        if (p.y > h + 20 || p.x < -20 || p.x > w + 20) Object.assign(p, spawn(false));
      }
    };

    let nextFlash = performance.now() + 3000;
    const loop = (now: number) => {
      draw();
      if (scene === 'storm' && now > nextFlash && flashRef.current) {
        flashRef.current.animate([{ opacity: 0 }, { opacity: 0.8 }, { opacity: 0.1 }, { opacity: 0.6 }, { opacity: 0 }], { duration: 700 });
        nextFlash = now + 4000 + Math.random() * 6000;
      }
      raf = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener('resize', resize);
    if (reduce) draw();
    else if (kind || scene === 'storm') raf = requestAnimationFrame(loop);

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce && (kind || scene === 'storm')) raf = requestAnimationFrame(loop);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [scene]);

  const cloudy = scene !== 'clear';
  return (
    <div className={`sky sky--${scene} ${isDay ? 'sky--day' : 'sky--night'}`} aria-hidden="true">
      {!isDay && (
        <div className="sky__stars">
          {Array.from({ length: 60 }, (_, i) => (
            <i key={i} style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 60}%`, animationDelay: `${(i % 7) * 0.5}s` }} />
          ))}
        </div>
      )}
      <div className="sky__orb" />
      {cloudy && (
        <div className="sky__clouds">
          {[0, 1, 2, 3].map((i) => (
            <svg key={i} className={`sky__cloud sky__cloud--${i}`} viewBox="0 0 200 80">
              <path d="M30 70h130a26 26 0 0 0 4-52 36 36 0 0 0-68-10 24 24 0 0 0-40 18 26 26 0 0 0-26 44Z" />
            </svg>
          ))}
        </div>
      )}
      <canvas ref={canvasRef} className="sky__canvas" />
      <div ref={flashRef} className="sky__flash" />
    </div>
  );
}

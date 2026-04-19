"use client";
import { useEffect, useRef } from "react";

export function NeuralMeshBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let W = 0, H = 0;

    function resize() {
      if (!canvas) return;
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx!.scale(dpr, dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    const AMBER  = { r: 245, g: 158, b: 11  };
    const VIOLET = { r: 139, g: 92,  b: 246 };
    const CYAN   = { r: 34,  g: 211, b: 238 };
    const PALETTE = [AMBER, AMBER, VIOLET, VIOLET, CYAN];

    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      r: number;
      color: { r: number; g: number; b: number };
      phase: number; phaseSpeed: number;
    }

    const N = 60;
    const pts: Particle[] = Array.from({ length: N }, () => {
      const c = PALETTE[Math.floor(Math.random() * PALETTE.length)] ?? AMBER;
      return {
        x: Math.random() * (W || 1200),
        y: Math.random() * (H || 700),
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: 1.8 + Math.random() * 2.5,
        color: c,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.018 + Math.random() * 0.025,
      };
    });

    interface Ring { x: number; y: number; rad: number; maxRad: number; a: number; c: { r: number; g: number; b: number } }
    const rings: Ring[] = [];
    let ringTick = 0;

    function draw() {
      ctx!.clearRect(0, 0, W, H);

      for (const p of pts) {
        p.x += p.vx; p.y += p.vy; p.phase += p.phaseSpeed;
        if (p.x < -60) p.x = W + 60;
        if (p.x > W + 60) p.x = -60;
        if (p.y < -60) p.y = H + 60;
        if (p.y > H + 60) p.y = -60;
      }

      const MAX = 160;
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const pi = pts[i]!, pj = pts[j]!;
          const dx = pi.x - pj.x;
          const dy = pi.y - pj.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < MAX) {
            const a = (1 - d / MAX) * 0.4;
            const c = pi.color;
            ctx!.beginPath();
            ctx!.moveTo(pi.x, pi.y);
            ctx!.lineTo(pj.x, pj.y);
            ctx!.strokeStyle = `rgba(${c.r},${c.g},${c.b},${a})`;
            ctx!.lineWidth = 0.65;
            ctx!.stroke();
          }
        }
      }

      ringTick++;
      if (ringTick > 80) {
        const p = pts[Math.floor(Math.random() * N)]!;
        rings.push({ x: p.x, y: p.y, rad: 0, maxRad: 55 + Math.random() * 70, a: 0.65, c: p.color });
        ringTick = 0;
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        const rng = rings[i]!;
        rng.rad += 1.1; rng.a -= 0.007;
        if (rng.a <= 0 || rng.rad > rng.maxRad) { rings.splice(i, 1); continue; }
        ctx!.beginPath();
        ctx!.arc(rng.x, rng.y, rng.rad, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(${rng.c.r},${rng.c.g},${rng.c.b},${rng.a})`;
        ctx!.lineWidth = 1;
        ctx!.stroke();
      }

      for (const p of pts) {
        const pulse = 0.55 + Math.sin(p.phase) * 0.45;
        const { r: cr, g: cg, b: cb } = p.color;
        const grd = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 7);
        grd.addColorStop(0, `rgba(${cr},${cg},${cb},${0.35 * pulse})`);
        grd.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r * 7, 0, Math.PI * 2);
        ctx!.fillStyle = grd;
        ctx!.fill();
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${cr},${cg},${cb},${0.9 * pulse})`;
        ctx!.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 120% 100% at 50% 60%, oklch(0.13 0.025 270) 0%, oklch(0.055 0.008 260) 100%)",
      }} />
      <div className="absolute pointer-events-none" style={{
        width: "65vw", height: "65vw", left: "-18vw", top: "-12vw",
        borderRadius: "50%",
        background: "radial-gradient(circle, oklch(0.72 0.22 290 / 20%) 0%, transparent 70%)",
        filter: "blur(60px)",
        animation: "drift1 24s ease-in-out infinite",
      }} />
      <div className="absolute pointer-events-none" style={{
        width: "55vw", height: "55vw", right: "-12vw", bottom: "-8vw",
        borderRadius: "50%",
        background: "radial-gradient(circle, oklch(0.78 0.2 75 / 16%) 0%, transparent 70%)",
        filter: "blur(70px)",
        animation: "drift2 30s ease-in-out infinite",
      }} />
      <div className="absolute pointer-events-none" style={{
        width: "45vw", height: "45vw", left: "28vw", top: "35vh",
        borderRadius: "50%",
        background: "radial-gradient(circle, oklch(0.74 0.16 210 / 12%) 0%, transparent 70%)",
        filter: "blur(50px)",
        animation: "drift3 20s ease-in-out infinite",
      }} />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ opacity: 0.75 }} />
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.04 }} xmlns="http://www.w3.org/2000/svg">
        <filter id="grain-bg">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-bg)" />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 h-20 flex items-end gap-[1.5px] px-0" style={{ opacity: 0.22 }}>
        {Array.from({ length: 140 }).map((_, i) => (
          <div key={i} className="flex-1 rounded-t-sm" style={{
            background: i % 3 === 0
              ? "oklch(0.72 0.2 290)" : i % 3 === 1
              ? "oklch(0.78 0.18 75)" : "oklch(0.74 0.14 210)",
            height: `${18 + Math.sin(i * 0.38) * 14 + Math.sin(i * 0.85 + 1.2) * 18}%`,
            animation: `specbar ${1.4 + (i % 7) * 0.17}s ease-in-out infinite`,
            animationDelay: `${(i % 13) * 0.07}s`,
            transformOrigin: "bottom",
          }} />
        ))}
      </div>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 50% 40%, transparent 30%, oklch(0 0 0 / 70%) 100%)",
      }} />
    </div>
  );
}

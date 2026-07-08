"use client";

// Confeti ligero sin dependencias: piezas con posiciones/colores deterministas.
const COLORS = ["#818cf8", "#a78bfa", "#38bdf8", "#34d399", "#fbbf24", "#f472b6"];
const PIECES = Array.from({ length: 40 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 10) * 0.12,
  duration: 2.2 + ((i * 13) % 12) / 10,
  color: COLORS[i % COLORS.length],
  size: 6 + (i % 4) * 2,
  rotate: (i * 47) % 360,
}));

export default function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.6,
            background: p.color,
            borderRadius: 2,
            transform: `rotate(${p.rotate}deg)`,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

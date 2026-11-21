import { KOLORY, RODZAJE, dataPL } from "@/lib/format";

export interface OkresT { rodzaj: string; kto: string; od: string; do: string; dni: number; kwota?: number }
const MS = 86400000;
const t = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));

/** Biały albo czarny tekst — zależnie od tego, który ma większy kontrast z danym tłem (#rrggbb). */
function tekstNa(tlo: string) {
  const m = /^#([0-9a-f]{6})$/i.exec(tlo);
  if (!m) return "#fff";
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.05 ? "#fff" : "#000";
}

const tylkoCzytnik = { position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)", margin: 0, padding: 0, listStyle: "none" } as const;

export default function Timeline({ okresy, start, etykiety }: { okresy: OkresT[]; start?: string; etykiety?: Record<string, string> }) {
  if (!okresy.length) return null;
  const min = Math.min(...okresy.map((o) => t(o.od)), start ? t(start) : Infinity);
  const max = Math.max(...okresy.map((o) => t(o.do))) + MS;
  const span = max - min;
  const pct = (x: number) => ((x - min) / span) * 100;
  // znaczniki co kwartał lub rok zależnie od rozpiętości
  const ticks: { l: string; p: number }[] = [];
  const d0 = new Date(min); const stepM = span / MS > 900 ? 12 : span / MS > 420 ? 6 : 3;
  let y = d0.getUTCFullYear(), m = Math.floor(d0.getUTCMonth() / stepM) * stepM; if (Date.UTC(y, m, 1) < min) m += stepM;
  for (let k = 0; k < 40; k++) { const dt = Date.UTC(y + Math.floor(m / 12), m % 12, 1); if (dt > max) break; ticks.push({ l: `${String((m % 12) + 1).padStart(2, "0")}.${y + Math.floor(m / 12)}`, p: pct(dt) }); m += stepM; }
  const kto = ["matka", "ojciec"].filter((k) => okresy.some((o) => o.kto === k));
  const uzyte = Array.from(new Set(okresy.map((o) => o.rodzaj)));
  const nazwaKto = (k: string) => etykiety?.[k] ?? (k === "matka" ? "Matka" : "Ojciec");
  return (
    <div className="tl">
      {/* Wersja dla czytników ekranu: lista okresów zamiast grafiki. */}
      <ul style={tylkoCzytnik} aria-label="Okresy urlopów i zasiłków">
        {okresy.map((o, i) => (
          <li key={i}>{nazwaKto(o.kto)}: {RODZAJE[o.rodzaj] ?? "Okres zasiłku"}, {dataPL(o.od)} – {dataPL(o.do)} ({o.dni} dni)</li>
        ))}
      </ul>
      <div aria-hidden="true">
        <div className="tl-axis">{ticks.map((k) => <span key={k.l} className="tl-tick" style={{ left: `${k.p}%` }}>{k.l}</span>)}</div>
        {kto.map((k) => (
          <div key={k}>
            <div className="tl-row-label">{nazwaKto(k)}</div>
            <div className="tl-row">
              {okresy.filter((o) => o.kto === k).map((o, i) => {
                const tlo = KOLORY[o.rodzaj] ?? "#555";
                return (
                  <div key={i} className="tl-bar" style={{ left: `${pct(t(o.od))}%`, width: `${Math.max(((t(o.do) + MS - t(o.od)) / span) * 100, 0.4)}%`, background: tlo, color: tekstNa(tlo) }}
                    title={`${RODZAJE[o.rodzaj] ?? "Okres zasiłku"}: ${dataPL(o.od)} – ${dataPL(o.do)} (${o.dni} dni)`}>{RODZAJE[o.rodzaj]?.replace("Urlop ", "")}</div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="leg">{uzyte.map((r) => <span key={r}><i style={{ background: KOLORY[r] ?? "#555" }} />{RODZAJE[r] ?? "Okres zasiłku"}</span>)}</div>
    </div>
  );
}

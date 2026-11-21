import { KOLORY, RODZAJE, dataPL } from "@/lib/format";

export interface OkresT { rodzaj: string; kto: string; od: string; do: string; dni: number; kwota?: number }
const MS = 86400000;
const t = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));

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
  return (
    <div className="tl" role="img" aria-label="Oś czasu urlopów i zasiłków">
      <div className="tl-axis">{ticks.map((k) => <span key={k.l} className="tl-tick" style={{ left: `${k.p}%` }}>{k.l}</span>)}</div>
      {kto.map((k) => (
        <div key={k}>
          <div className="tl-row-label">{etykiety?.[k] ?? (k === "matka" ? "Matka" : "Ojciec")}</div>
          <div className="tl-row">
            {okresy.filter((o) => o.kto === k).map((o, i) => (
              <div key={i} className="tl-bar" style={{ left: `${pct(t(o.od))}%`, width: `${Math.max(((t(o.do) + MS - t(o.od)) / span) * 100, 0.4)}%`, background: KOLORY[o.rodzaj] ?? "#555" }}
                title={`${RODZAJE[o.rodzaj] ?? "Okres zasiłku"}: ${dataPL(o.od)} – ${dataPL(o.do)} (${o.dni} dni)`}>{RODZAJE[o.rodzaj]?.replace("Urlop ", "")}</div>
            ))}
          </div>
        </div>
      ))}
      <div className="leg">{uzyte.map((r) => <span key={r}><i style={{ background: KOLORY[r] ?? "#555" }} />{RODZAJE[r] ?? "Okres zasiłku"}</span>)}</div>
    </div>
  );
}

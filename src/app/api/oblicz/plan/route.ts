import { post } from "@/lib/handler";
import { planZasilku } from "@/engine/kalkulator";

// Date.parse przepuszcza 2026-02-31 jako 3 marca, więc sprawdzamy, czy data po sparsowaniu to ta sama data
const dataOk = (d: unknown) => {
  if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const t = new Date(`${d}T00:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
};

export const POST = post((b, p) => {
  if (b?.dataZdarzenia != null && !dataOk(b.dataZdarzenia)) throw new Error("Nieprawidłowa data zdarzenia. Podaj ją w formacie RRRR-MM-DD.");
  for (const k of ["matka", "ojciec"]) if (b?.podstawy?.[k] != null && !(Number(b.podstawy[k]) >= 0)) throw new Error("Podstawa zasiłku musi być liczbą nieujemną.");
  return planZasilku(b, p);
});

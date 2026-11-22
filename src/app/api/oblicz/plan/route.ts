import { post } from "@/lib/handler";
import { planZasilku, planZNetto } from "@/engine/kalkulator";

const dataOk = (d: unknown) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));

// Odpowiedź = wynik silnika (kwoty przed zaliczką na podatek) + orientacyjne kwoty netto (miesiecznieNetto, kwotaNetto, sumyNetto).
export const POST = post((b, p) => {
  if (b?.dataZdarzenia != null && !dataOk(b.dataZdarzenia)) throw new Error("Nieprawidłowa data zdarzenia. Podaj ją w formacie RRRR-MM-DD.");
  for (const k of ["matka", "ojciec"]) if (b?.podstawy?.[k] != null && !(Number(b.podstawy[k]) >= 0)) throw new Error("Podstawa zasiłku musi być liczbą nieujemną.");
  return planZNetto(planZasilku(b, p), p);
});

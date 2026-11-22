import { post } from "@/lib/handler";
import { porownajWarianty, planZNetto } from "@/engine/kalkulator";

// Oba warianty z orientacyjnymi kwotami netto (jak /api/oblicz/plan).
export const POST = post((b, p) => {
  const w = porownajWarianty(b, p);
  return { ...w, zmienny_100_70: planZNetto(w.zmienny_100_70, p), usredniony_81_5: planZNetto(w.usredniony_81_5, p) };
});

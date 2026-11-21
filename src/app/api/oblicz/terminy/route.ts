import { post } from "@/lib/handler";
import { planZasilku, terminy } from "@/engine/kalkulator";
/** { wejscie: PlanWejscie } albo { tytul, dataZdarzenia, plan } */
export const POST = post((b, p) => {
  const plan = b.plan ?? planZasilku(b.wejscie, p);
  return terminy({ tytul: b.tytul ?? b.wejscie.tytul, dataZdarzenia: b.dataZdarzenia ?? b.wejscie.dataZdarzenia, plan }, p);
});

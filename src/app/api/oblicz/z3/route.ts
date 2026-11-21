import { post } from "@/lib/handler";
import { wierszZ3NaMiesiac, podstawaPracownik } from "@/engine/kalkulator";

/** Most Z-3 -> silnik: { wiersze: WierszZ3Miesieczny[], premie..., pelnyWymiarEtatu } */
export const POST = post((b, p) => {
  const miesiace = (b.wiersze ?? []).map(wierszZ3NaMiesiac);
  return { miesiace, podstawa: podstawaPracownik({ miesiace, premieKwartalne4Kw: b.premieKwartalne4Kw, premieRoczne: b.premieRoczne, pelnyWymiarEtatu: b.pelnyWymiarEtatu ?? true }, p) };
});

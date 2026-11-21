import { post } from "@/lib/handler";
import { podstawaPracownik, podstawaNiepracownik, type MiesiacWynagrodzenia } from "@/engine/kalkulator";

/** { typ: "pracownik"|"niepracownik", ... } — tryb prosty: sredniaBrutto (+ liczbaMiesiecy) albo pełna lista miesięcy. */
export const POST = post((b, p) => {
  if (b.typ === "niepracownik") {
    const miesiace = b.miesiace ?? Array.from({ length: b.liczbaMiesiecy ?? 12 }, (_, i) => ({ miesiac: `m${i + 1}`, podstawaSkladek: Number(b.sredniaPodstawa) }));
    return podstawaNiepracownik({ miesiace, zadeklarowanaKwota: !!b.zadeklarowanaKwota }, p);
  }
  const miesiace: MiesiacWynagrodzenia[] = b.miesiace ?? Array.from({ length: b.liczbaMiesiecy ?? 12 }, (_, i) => ({ miesiac: `m${i + 1}`, kwota: Number(b.sredniaBrutto) }));
  if (!miesiace.length || miesiace.some((m) => !(m.kwota >= 0))) throw new Error("Podaj wynagrodzenie brutto (liczba ≥ 0).");
  return podstawaPracownik({ miesiace, premieKwartalne4Kw: b.premieKwartalne4Kw, premieRoczne: b.premieRoczne, pelnyWymiarEtatu: b.pelnyWymiarEtatu ?? true }, p);
});

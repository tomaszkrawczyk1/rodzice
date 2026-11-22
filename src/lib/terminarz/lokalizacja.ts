// Tłumaczenie reguł terminarza (rules.json) na wybrany język. Klucz tłumaczenia = polski tekst reguły,
// więc rules.json zostaje bez zmian, a brak wpisu w słowniku zostawia tekst po polsku.
// Reguły tłumaczymy PRZED policzeniem terminów: wtedy znaczniki {{birth+118d}} w opisach zamieni na datę buildCalendar.

type T = (pl: string) => string;
type Regula = {
  title: string; body?: string; bodyByEmployment?: { [k: string]: string | undefined }; institution?: string | null;
  forms?: string[]; links?: { title: string; url: string }[];
};

export function lokalizujReguly<R extends { rules: Regula[] }>(reguly: R, t: T): R {
  return {
    ...reguly,
    rules: reguly.rules.map((r) => ({
      ...r,
      title: t(r.title),
      ...(r.body !== undefined && { body: t(r.body) }),
      ...(r.bodyByEmployment && { bodyByEmployment: Object.fromEntries(Object.entries(r.bodyByEmployment).map(([k, v]) => [k, v === undefined ? v : t(v)])) }),
      ...(typeof r.institution === "string" && { institution: t(r.institution) }),
      ...(r.forms && { forms: r.forms.map(t) }),
      ...(r.links && { links: r.links.map((l) => ({ ...l, title: t(l.title) })) }),
    })),
  };
}

type Opcja = { etykieta: string; nastepny: string };
type Drzewo = Record<string, { typ: "pytanie"; opcje: Opcja[] } | { typ: "wynik" }>;

export function rozwinPostep(kroki: readonly unknown[], start: string, drzewo: Drzewo) {
  let id = start;
  const wybory: string[] = [];
  const zapisane: number[] = [];
  for (const indeks of kroki) {
    const wezel = drzewo[id];
    if (wezel?.typ !== "pytanie" || typeof indeks !== "number" || !Number.isInteger(indeks)) break;
    const opcja = wezel.opcje[indeks];
    if (!opcja || !drzewo[opcja.nastepny]) break;
    id = opcja.nastepny;
    wybory.push(opcja.etykieta);
    zapisane.push(indeks);
  }
  return { id, wybory, zapisane };
}

export function odczytajPostep(surowy: string | null, start: string, drzewo: Drzewo) {
  try {
    const postep: unknown = JSON.parse(surowy ?? "null");
    return Array.isArray(postep) ? rozwinPostep(postep, start, drzewo).zapisane : [];
  } catch {
    return [];
  }
}

/** Kroki w adresie: indeksy wybranych opcji rozdzielone kropką, np. `?krok=1.1.2`. Pusty zapis = początek. */
export const kodujKroki = (kroki: readonly number[]) => kroki.join(".");

export function odczytajKrokiZAdresu(surowy: string | null, start: string, drzewo: Drzewo) {
  if (!surowy || !/^\d{1,3}(\.\d{1,3})*$/.test(surowy)) return [];
  return rozwinPostep(surowy.split(".").map(Number), start, drzewo).zapisane;
}

/** Ile pytań najwyżej zostało od węzła `id` (wliczając bieżące) – do paska „Pytanie 2 z 4". */
export function pozostalePytania(id: string, drzewo: Drzewo, odwiedzone: ReadonlySet<string> = new Set()): number {
  const w = drzewo[id];
  if (w?.typ !== "pytanie" || odwiedzone.has(id)) return 0;
  const dalej = new Set(odwiedzone).add(id);
  return 1 + Math.max(0, ...w.opcje.map((o) => pozostalePytania(o.nastepny, drzewo, dalej)));
}

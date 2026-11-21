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

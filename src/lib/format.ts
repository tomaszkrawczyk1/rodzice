const waluta = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", useGrouping: "always" });
const pelnaData = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const miesiacRok = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric", timeZone: "UTC" });

export const pln = (n: number | undefined | null) => n == null || !Number.isFinite(n) ? "—" : waluta.format(n);
const walutaPelna = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0, useGrouping: "always" });
/** Kwota „na oko", do pełnych złotych: tam, gdzie obok stoi „ok.", grosze tylko by udawały dokładność. */
export const plOk = (n: number | undefined | null) => n == null || !Number.isFinite(n) ? "—" : walutaPelna.format(n);
export const liczba =(n: number, d = 2) => new Intl.NumberFormat("pl-PL", { maximumFractionDigits: d }).format(n);
export function dataPL(iso?: string | null) {
  if (!iso) return "—";
  const data = new Date(iso + "T00:00:00Z");
  return Number.isFinite(data.getTime()) ? pelnaData.format(data) : "—";
}
export function miesiacPL(rok: number, miesiac: number) {
  if (!Number.isInteger(rok) || !Number.isInteger(miesiac) || miesiac < 1 || miesiac > 12) return "—";
  return miesiacRok.format(new Date(Date.UTC(rok, miesiac - 1, 1)));
}
export const dataKrotka = (iso?: string | null) => (iso ? iso.split("-").reverse().join(".") : "—");
export const tygodnie = (n: number) => `${liczba(n, 1)} ${n === 1 ? "tydzień" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 > 20) ? "tygodnie" : "tygodni"}`;
export const dzis = () => new Date().toISOString().slice(0, 10);
export const RODZAJE: Record<string, string> = {
  macierzynski: "Urlop macierzyński", macierzynski_przed_porodem: "Macierzyński przed porodem", uzupelniajacy: "Uzupełniający urlop macierzyński",
  rodzicielski: "Urlop rodzicielski", rodzicielski_9tyg_drugiego_rodzica: "Rodzicielski – 9 tyg. drugiego rodzica", ojcowski: "Urlop ojcowski",
  na_warunkach_macierzynskiego: "Urlop na warunkach macierzyńskiego",
};
export const KOLORY: Record<string, string> = {
  macierzynski: "#00993f", macierzynski_przed_porodem: "#4cb86f", uzupelniajacy: "#7a4cc4", rodzicielski: "#00416e", rodzicielski_9tyg_drugiego_rodzica: "#0a7fb8",
  ojcowski: "#8a1c4d", na_warunkach_macierzynskiego: "#00993f",
};

export function opisObliczenia(tekst: string) {
  return tekst
    .replace(/\d{4}-\d{2}-\d{2}/g, (d) => dataPL(d))
    .replace(/(\d+(?:\.\d+)?) zł/g, (_, n) => pln(Number(n)));
}

export function opisTerminu(tekst: string) {
  return opisObliczenia(tekst)
    .replace("Wniosek matki o zasiłek w pełnym wymiarze", "Wniosek matki o uśrednioną stawkę zasiłku")
    .replace("Wniosek o zasiłek w pełnym wymiarze", "Wniosek o uśrednioną stawkę zasiłku")
    .replace(/\s*— nieprzekraczalnie/i, "")
    .replace(/(\d) %/g, "$1%");
}

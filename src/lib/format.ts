export const pln = (n: number | undefined | null) => (n == null || Number.isNaN(n) ? "—" : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(n));
export const liczba = (n: number, d = 2) => new Intl.NumberFormat("pl-PL", { maximumFractionDigits: d }).format(n);
export const dataPL = (iso?: string | null) => (iso ? new Date(iso + "T00:00:00Z").toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "—");
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
  ojcowski: "#d97a00", na_warunkach_macierzynskiego: "#00993f",
};

export function dataZFormularza(wartosc: string): string {
  const dopasowanie = /^(\d{1,2})[.,\-/ ](\d{1,2})[.,\-/ ](\d{4})$/.exec(wartosc.trim());
  if (!dopasowanie) return "";
  const [, dzien, miesiac, rok] = dopasowanie;
  if (Number(rok) === 0) return "";
  const iso = `${rok}-${miesiac.padStart(2, "0")}-${dzien.padStart(2, "0")}`;
  const data = new Date(`${iso}T00:00:00Z`);
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === iso ? iso : "";
}

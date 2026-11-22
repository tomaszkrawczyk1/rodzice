import { cookies } from "next/headers";
import { CIASTECZKO_JEZYKA, czyJezyk, tlumaczDla, type Jezyk } from "./jezyki";
import { formatyDla } from "./formaty";

/** Język wybrany przez użytkownika (ciasteczko). Tylko dla komponentów serwerowych. */
export async function jezykZSerwera(): Promise<Jezyk> {
  const v = (await cookies()).get(CIASTECZKO_JEZYKA)?.value;
  return czyJezyk(v) ? v : "pl";
}
export async function tZSerwera() {
  return tlumaczDla(await jezykZSerwera());
}
/** Daty, kwoty i liczby w języku użytkownika (komponenty serwerowe). */
export async function formatyZSerwera() {
  return formatyDla(await jezykZSerwera());
}

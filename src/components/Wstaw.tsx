import { Fragment, type ReactNode } from "react";

/**
 * Zdanie z elementami w środku (pogrubiona kwota, link): tekst przychodzi już przetłumaczony przez t(),
 * a miejsca {nazwa} zastępujemy elementami React. Kolejność słów w zdaniu ustala tłumacz, nie kod.
 * Przykład: <Wstaw tekst={t("Razem: {kwota} do wypłaty.")} wartosci={{ kwota: <b>{pln(x)}</b> }} />
 */
export function Wstaw({ tekst, wartosci }: { tekst: string; wartosci: Record<string, ReactNode> }) {
  return (
    <>
      {tekst.split(/(\{\w+\})/).map((czesc, i) => {
        const m = /^\{(\w+)\}$/.exec(czesc);
        return m && m[1] in wartosci ? <Fragment key={i}>{wartosci[m[1]]}</Fragment> : czesc;
      })}
    </>
  );
}

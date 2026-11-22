import Link from "next/link";
import { Fragment, type ReactNode } from "react";

/**
 * Zamienia w przetłumaczonym zdaniu **tekst** na pogrubienie, a [napis](/adres) na odnośnik.
 * Dzięki temu zdanie z pogrubieniem albo linkiem tłumaczy się w całości (szyk zdania bywa różny w językach).
 * Klient: const tb = useTb(); tb("Złóż do **{data}**. [Zasady](/poradnik)", { data }).
 * Serwer: pogrubienia(t("…")).
 */
export function pogrubienia(tekst: string): ReactNode {
  return tekst.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g).map((cz, i) => {
    const b = /^\*\*([^*]+)\*\*$/.exec(cz);
    if (b) return <b key={i}>{b[1]}</b>;
    const l = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(cz);
    if (l) return l[2].startsWith("/") ? <Link key={i} href={l[2]}>{l[1]}</Link> : l[2].startsWith("#") ? <a key={i} href={l[2]}>{l[1]}</a> : <a key={i} href={l[2]} target="_blank" rel="noopener noreferrer">{l[1]}</a>;
    return cz;
  });
}

/** Wstawia elementy Reacta w miejsce {nazwa} w już przetłumaczonym zdaniu: wstaw(t("Do {data}."), { data: <Data /> }). */
export function wstaw(tekst: string, elementy: Record<string, ReactNode>): ReactNode {
  return tekst.split(/(\{\w+\})/g).map((cz, i) => {
    const m = /^\{(\w+)\}$/.exec(cz);
    return m && m[1] in elementy ? <Fragment key={i}>{elementy[m[1]]}</Fragment> : cz;
  });
}

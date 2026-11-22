"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TRUDNE } from "@/content/tresci";
import { WSPARCIE_UWAGA, podmiotyDla, telHref } from "@/lib/wsparcie";
import { KONTAKTY_DLA_SYTUACJI, POMOC_TERAZ, krotkiAdres, telLink } from "@/lib/kontakty";
import { dataPL } from "@/lib/format";
import { przejdzKrok } from "@/lib/adres-kroku";
import css from "./Trudne.module.css";
import { useFormaty, useT } from "@/lib/jezyk";

// Stan domyślny (bez parametru) jest neutralny: powitanie i lista sytuacji, nic nie jest rozwinięte.
// Wybrana sytuacja jest w adresie (`?sytuacja=zgon`), więc można do niej podlinkować, a „Wstecz” wraca do listy.

/** Łagodniejsze etykiety (sens prawny bez zmian). Treści merytoryczne pochodzą z TRUDNE w src/content/tresci.ts. */
const ETYKIETY: Record<string, string> = {
  ciaza: "Gdy ciąża jest zagrożona albo doszło do poronienia",
  wczesniak: "Gdy dziecko urodziło się za wcześnie lub jest w szpitalu",
  chore: "Gdy dziecko jest ciężko chore",
  martwe: "Gdy dziecko urodziło się bez oznak życia (martwe urodzenie)",
  zgon: "Gdy dziecko zmarło po porodzie",
  matka: "Gdy mama dziecka zmarła, jest ciężko chora lub nie może się nim zająć",
};

/** Kolejność na liście: od sytuacji najczęstszych do najcięższych; nieznane id (nowe w TRUDNE) na końcu. */
const KOLEJNOSC = Object.keys(ETYKIETY);
const pozycja = (id: string) => (KOLEJNOSC.includes(id) ? KOLEJNOSC.indexOf(id) : KOLEJNOSC.length);

const SYTUACJE = [...TRUDNE, { id: "chore", t: "Dziecko jest ciężko chore", d: ["Nie musisz radzić sobie z tym sam. Poniżej są miejsca, gdzie rodzice ciężko chorych dzieci dostają pomoc."] }]
  .map((x) => ({ ...x, t: ETYKIETY[x.id] ?? x.t }))
  .sort((a, b) => pozycja(a.id) - pozycja(b.id));

type Sytuacja = (typeof SYTUACJE)[number];

export default function Trudne() {
  const t = useT();
  const { dataPL } = useFormaty();
  const zAdresu = useSearchParams().get("sytuacja");
  const idZAdresu = SYTUACJE.some((x) => x.id === zAdresu) ? zAdresu : null;
  // Lokalna kopia, żeby widok zmieniał się od razu (adres odświeża się chwilę później); „Wstecz” ją synchronizuje.
  const [id, setId] = useState<string | null>(idZAdresu);
  useEffect(() => { setId(idZAdresu); }, [idZAdresu]);
  const sytuacja = id ? SYTUACJE.find((x) => x.id === id) ?? null : null;

  // Po kliknięciu przenosimy fokus na nagłówek nowego widoku (czytniki ekranu, klawiatura). Nie przy wejściu z linku.
  const doFokusu = useRef<"tytul" | "lista" | null>(null);
  const tytul = useRef<HTMLHeadingElement>(null);
  const lista = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const cel = doFokusu.current === "tytul" ? tytul.current : doFokusu.current === "lista" ? lista.current : null;
    doFokusu.current = null;
    cel?.focus();
  }, [id]);

  function wybierz(nowe: string | null) {
    doFokusu.current = nowe ? "tytul" : "lista";
    setId(nowe);
    przejdzKrok({ sytuacja: nowe });
  }

  return (
    <>
      <h1>{t("Pomoc w trudnej sytuacji")}</h1>
      <p className="lead">Jeśli tu jesteś, być może przechodzisz przez coś bardzo trudnego. Nie musisz niczego załatwiać od razu. Wybierz sytuację, która Cię dotyczy, a pokażemy, co Ci przysługuje i gdzie znaleźć wsparcie.</p>

      <aside className={`card ${css.teraz}`} aria-labelledby="pomoc-teraz">
        <h2 id="pomoc-teraz">Potrzebujesz pomocy teraz?</h2>
        <ul>
          {POMOC_TERAZ.filter((k) => k.telefon).map((k) => (
            <li key={k.id}>
              <a className={css.numer} href={telLink(k.telefon!)}>{k.telefon}</a> – {k.nazwa}{k.godziny ? `, ${k.godziny}` : ""}. <span className="muted">{k.opis}</span>
            </li>
          ))}
        </ul>
      </aside>

      <div className="mt" aria-live="polite">
        {!sytuacja ? (
          <section className="card">
            <h2 ref={lista} tabIndex={-1} className={css.tytul}>{t("Wybierz sytuację")}</h2>
            <p className="muted">Możesz wrócić do tej listy w każdej chwili.</p>
            <ul className={`${css.lista} mt`}>
              {SYTUACJE.map((x) => (
                <li key={x.id}>
                  <button type="button" className={css.opcja} onClick={() => wybierz(x.id)}>{x.t}</button>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <Szczegoly sytuacja={sytuacja} tytul={tytul} wstecz={() => wybierz(null)} />
        )}
      </div>
    </>
  );
}

const NOWA_KARTA = { target: "_blank", rel: "noopener noreferrer" } as const;

function Szczegoly({ sytuacja, tytul, wstecz }: {
  sytuacja: Sytuacja;
  tytul: React.RefObject<HTMLHeadingElement | null>;
  wstecz: () => void;
}) {
  const t = useT();
  const organizacje = podmiotyDla(sytuacja.id);
  const dodatkowe = KONTAKTY_DLA_SYTUACJI[sytuacja.id] ?? [];
  return (
    <>
      <button type="button" className={css.wstecz} onClick={wstecz}>← Wszystkie sytuacje</button>
      <section className="card navy mt">
        <h2 ref={tytul} tabIndex={-1} className={css.tytul}>{sytuacja.t}</h2>
        {sytuacja.d.length > 0 && <ul className="clean">{sytuacja.d.map((x) => <li key={x}>{x}</li>)}</ul>}
          <p className="mt"><Link href="/sprawa/trudna-sytuacja">{t("Sprawdź, co załatwić krok po kroku")}</Link></p>
        </section>
      {(organizacje.length > 0 || dodatkowe.length > 0) && <section className="card accent mt">
          <h2>{t("Gdzie szukać wsparcia")}</h2>
        <ul className="clean">
          {organizacje.map((o) => (
            <li key={o.id}>
              <b>{o.nazwa}</b><br />{o.opis}
              <br />{o.telefon && <>{t("Telefon: ")}<a href={telHref(o.telefon)}>{o.telefon}</a>{o.godziny ? ` (${o.godziny})` : ""}. </>}
              {o.email && <>{t("E-mail: ")}<a href={`mailto:${o.email}`}>{o.email}</a>. </>}Strona: <a href={o.www} {...NOWA_KARTA}>{krotkiAdres(o.www)}</a>
              <br /><span className="muted">{o.zakres}{o.uwaga ? ` ${o.uwaga}` : ""} Sprawdzone {dataPL(o.dataSprawdzenia)}, <a href={o.zrodlo} {...NOWA_KARTA}>{t("źródło")}</a>.{o.pewnosc === "do_potwierdzenia" ? " Do potwierdzenia: zadzwoń lub napisz, zanim na tym polegasz." : ""}</span>
            </li>
          ))}
          {dodatkowe.map((k) => (
            <li key={k.id}>
              <b>{k.nazwa}</b><br />{k.opis}
              <br />{k.telefon && <>{t("Telefon: ")}<a href={telLink(k.telefon)}>{k.telefon}</a>{k.godziny ? ` (${k.godziny})` : ""}. </>}
              {k.www && <>Strona: <a href={k.www} {...NOWA_KARTA}>{krotkiAdres(k.www)}</a></>}
            </li>
          ))}
        </ul>
        <p className="muted mt">{WSPARCIE_UWAGA}</p>
        </section>}
    </>
  );
}

"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DRZEWO, DRZEWO_START, DRUKI, kalkulatorLink, pytanie } from "@/content/poradnik";
import { pytanieWJezyku } from "@/content/poradnik-i18n";
import { useJezyk } from "@/lib/jezyk";
import { kodujKroki, odczytajKrokiZAdresu, rozwinPostep } from "@/lib/postep-kreatora";
import { przejdzKrok, wrocDoKroku } from "@/lib/adres-kroku";
import { przejdzDoKroku } from "@/lib/ekran";

// Stan kreatora siedzi w adresie: `?krok=1.1.2` (indeksy wybranych odpowiedzi) i `?sciezka=ojciec`.
// Każda odpowiedź to osobny wpis historii, więc „Wstecz" przeglądarki cofa o jedno pytanie,
// a adres można odświeżyć i podlinkować.
export default function Pytania() {
  const { t, jezyk } = useJezyk();
  const params = useSearchParams();
  const start = params.get("sciezka") === "ojciec" ? "po_podzial" : DRZEWO_START;
  const postep = odczytajKrokiZAdresu(params.get("krok"), start, DRZEWO);
  const klucz = kodujKroki(postep);
  const { id, wybory } = rozwinPostep(postep, start, DRZEWO);
  const w = DRZEWO[id];
  const naglowek = useRef<HTMLHeadingElement>(null);
  const poprzedniKlucz = useRef(klucz);

  // Po zmianie kroku (kliknięcie, „Wstecz", „Dalej" przeglądarki) fokus trafia na nowy nagłówek.
  // Przy pierwszym wejściu na stronę (także po odświeżeniu) fokusu nie przenosimy.
  useEffect(() => {
    if (poprzedniKlucz.current === klucz) return;
    poprzedniKlucz.current = klucz;
    przejdzDoKroku(naglowek.current, naglowek.current);
  }, [klucz]);

  return (
    <>
      <p className="muted">{t("Adres tej strony zawiera Twoje odpowiedzi: możesz go zapisać, odświeżyć albo cofnąć się przyciskiem „Wstecz” przeglądarki.")}</p>
      {wybory.length > 0 && <p className="small muted">{t("Twoje wybory: {wybory}", { wybory: wybory.map((x) => t(x)).join(" / ") })}</p>}
      {w.typ === "pytanie" ? (
        <section className="card navy" aria-labelledby="kq">
          <h2 id="kq" ref={naglowek} tabIndex={-1}>{t(w.tekst)}</h2>
          {w.podpowiedz && <p>{t(w.podpowiedz)}</p>}
          <div>
            {w.opcje.map((o, i) => (
              <button key={o.nastepny + o.etykieta} className="persona" onClick={() => przejdzKrok({ krok: kodujKroki([...postep, i]) })}>{t(o.etykieta)}</button>
            ))}
          </div>
        </section>
      ) : (
        <section className="card accent">
          <h2 ref={naglowek} tabIndex={-1}>{t(w.tytul)}</h2>
          <ul className="clean">
            {w.pytania.map((q) => {
              const oryginal = pytanie(q);
              const p = oryginal && pytanieWJezyku(oryginal, jezyk);
              return p && <li key={q}><Link href={`/poradnik#${q}`}>{p.pytanie}</Link>
                {p.status !== "ok" && <> <span className="badge warn">{t("Sprawdź w ZUS")}</span></>}
              </li>;
            })}
          </ul>
          {id === "wynik_ojcowski" && <p className="mt"><Link href="/wnioski?urlop=ojcowski">{t("Przygotuj wniosek do pracodawcy")}</Link></p>}
          {w.druki.some((id) => DRUKI.some((d) => d.id === id)) && <>
            <h3 className="mt">{t("Formularze")}</h3>
            <ul className="clean">{w.druki.map((id) => {
              const d = DRUKI.find((x) => x.id === id);
              return d && <li key={id}><Link href={`/druki#${id}`}>{t(d.nazwa)}</Link></li>;
            })}</ul>
          </>}
          {(() => {
            const k = kalkulatorLink(w.kalkulator);
            return k && <p className="mt"><Link className="btn btn-primary" href={k.href}>{t(id === "wynik_ojcowski" ? "Policz zasiłek dla taty" : k.etykieta)}</Link></p>;
          })()}
        </section>
      )}
      {postep.length > 0 && <div className="row mt no-print">
        <button className="btn btn-ghost" onClick={() => wrocDoKroku({ krok: kodujKroki(postep.slice(0, -1)) })}>{t("Wróć do poprzedniego pytania")}</button>
        <button className="btn btn-ghost" onClick={() => przejdzKrok({ krok: null })}>{t("Zacznij od początku")}</button>
      </div>}
      {start !== DRZEWO_START && <p className="mt"><Link href="/kreator">{t("Zobacz wszystkie sytuacje")}</Link></p>}
    </>
  );
}

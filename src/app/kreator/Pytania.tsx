"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DRZEWO, DRZEWO_START, DRUKI, STATUS_OPIS, kalkulatorLink, pytanie, type Status, type Wezel } from "@/content/poradnik";
import { kodujKroki, odczytajKrokiZAdresu, pozostalePytania, rozwinPostep } from "@/lib/postep-kreatora";
import { przejdzKrok, wrocDoKroku } from "@/lib/adres-kroku";
import { przejdzDoKroku } from "@/lib/ekran";
import SwiadczenieRodzicielskie from "./SwiadczenieRodzicielskie";
import { INNE_SWIADCZENIA } from "./inne-swiadczenia";
import { useJezyk } from "@/lib/jezyk";
import { pytanieWJezyku } from "@/content/poradnik-i18n";

// Pola wyniku z drzewa, których nie opisuje wspólny typ Wezel w src/content/poradnik.ts.
type Odnosnik = { href?: string; etykieta: string };
type DodatkiWyniku = {
  status?: Status; komunikat_luki?: string; ton?: "delikatny"; wstep?: string;
  cta?: Odnosnik; inne_swiadczenia?: string[];
};
type WezelWynik = Extract<Wezel, { typ: "wynik" }> & DodatkiWyniku;

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

  // „Z ilu” = pytania już za Tobą + najdłuższa możliwa droga od tego miejsca (liczba może się tylko zmniejszać).
  const razem = postep.length + pozostalePytania(id, DRZEWO);

  return (
    <>
      {w.typ === "pytanie"
        ? <Pasek tekst={postep.length === 0 ? t("Pytanie 1 – całość zajmie około minuty") : t("Pytanie {n} z {z}", { n: postep.length + 1, z: razem })} procent={(postep.length / razem) * 100} />
        : <Pasek tekst={t("Gotowe – oto, co dla Ciebie znaleźliśmy")} procent={100} />}
      {wybory.length > 0 && <p className="small muted kreator-wybory">{t("Twoje odpowiedzi:")} {wybory.map((x) => t(x)).join(" → ")}</p>}

      {w.typ === "pytanie" ? (
        <section className="card navy" aria-labelledby="kq">
          <h2 id="kq" ref={naglowek} tabIndex={-1}>{t(w.tekst)}</h2>
          {w.podpowiedz && <p>{t(w.podpowiedz)}</p>}
          <div className="kreator-opcje">
            {w.opcje.map((o, i) => (
              <button key={o.nastepny + o.etykieta} type="button" className="persona kreator-opcja" onClick={() => przejdzKrok({ krok: kodujKroki([...postep, i]) })}>
                <span>{t(o.etykieta)}</span><span aria-hidden="true" className="kreator-strzalka">›</span>
              </button>
            ))}
          </div>
        </section>
      ) : <Wynik id={id} w={w} naglowek={naglowek} />}

      {postep.length > 0 && <div className="kreator-nawigacja no-print">
        <button type="button" className="btn btn-ghost kreator-duzy" onClick={() => wrocDoKroku({ krok: kodujKroki(postep.slice(0, -1)) })}>{t("‹ Wróć")}</button>
        <button type="button" className="btn btn-ghost kreator-duzy" onClick={() => przejdzKrok({ krok: null })}>{t("Zacznij od nowa")}</button>
      </div>}
      {start !== DRZEWO_START && <p className="mt"><Link href="/kreator">{t("Zobacz wszystkie sytuacje")}</Link></p>}
      {postep.length > 0 && <p className="small muted mt">{t("Możesz zapisać lub wysłać komuś link do tej strony – otworzy się w tym samym miejscu.")}</p>}
    </>
  );
}

function Pasek({ tekst, procent }: { tekst: string; procent: number }) {
  return (
    <div className="kreator-pasek">
      <p className="kreator-pasek-tekst" aria-live="polite">{tekst}</p>
      <div className="kreator-pasek-tlo" aria-hidden="true">
        <div className="kreator-pasek-wypelnienie" style={{ width: `${Math.max(4, Math.min(100, procent))}%` }} />
      </div>
    </div>
  );
}

function Wynik({ id, w: wezel, naglowek }: { id: string; w: Extract<Wezel, { typ: "wynik" }>; naglowek: React.RefObject<HTMLHeadingElement | null> }) {
  const w = wezel as WezelWynik;
  const { t, jezyk } = useJezyk();
  // Świadczenie rodzicielskie liczymy na miejscu – nie odsyłamy rodzica po porodzie na stronę „w ciąży”.
  const kosiniakowe = w.kalkulator?.tryb === "swiadczenie_rodzicielskie";
  const domyslny = kosiniakowe ? null : kalkulatorLink(w.kalkulator);
  // Wynik bez kalkulatora (np. ochrona w pracy, odpis aktu) może mieć własny przycisk z `cta` w drzewie.
  const cta = domyslny
    ? { href: w.cta?.href ?? domyslny.href, etykieta: w.cta?.etykieta ?? domyslny.etykieta }
    : w.cta?.href ? { href: w.cta.href, etykieta: w.cta.etykieta } : null;
  const opisStatusu = w.status === "luka" ? (w.komunikat_luki ?? STATUS_OPIS.luka) : w.status === "do_potwierdzenia" ? STATUS_OPIS.do_potwierdzenia : "";
  const druki = w.druki.flatMap((d) => DRUKI.filter((k) => k.id === d));
  const inne = (w.inne_swiadczenia ?? []).flatMap((k) => INNE_SWIADCZENIA[k] ? [INNE_SWIADCZENIA[k]] : []);

  return (
    <section className="card accent">
      <h2 ref={naglowek} tabIndex={-1}>{t(w.tytul)}</h2>
      {w.wstep && <p className="lead">{t(w.wstep)}</p>}
      {opisStatusu && <div className="alert warn"><p>{t(opisStatusu)}</p></div>}

      {kosiniakowe && <SwiadczenieRodzicielskie planowane={id.startsWith("wynik_plan")} />}

      {cta && <p className="mt"><Link className="btn btn-primary kreator-duzy" href={cta.href}>{t(cta.etykieta)}</Link></p>}

      <h3 className="mt">{t("Przeczytaj w poradniku")}</h3>
      <ul className="clean">
        {w.pytania.map((q) => {
          const p = pytanie(q);
          return p && <li key={q}><Link href={`/poradnik#${q}`}>{pytanieWJezyku(p, jezyk).pytanie}</Link>
            {p.status !== "ok" && <> <span className="badge warn">{t("Sprawdź w ZUS")}</span></>}
          </li>;
        })}
      </ul>

      {druki.length > 0 && <>
        <h3 className="mt">{t("Formularze")}</h3>
        <ul className="clean">{druki.map((d) => <li key={d.id}><Link href={`/druki#${d.id}`}>{t(d.nazwa)}</Link></li>)}</ul>
      </>}

      {inne.length > 0 && <>
        <h3 className="mt">{t("Po narodzinach dziecka pamiętaj też o")}</h3>
        {inne.map((s) => (
          <div key={s.id} className="kreator-blok">
            <h4>{t(s.nazwa)}</h4>
            <p><b>{t(s.ile)}</b> {t(s.komu)}</p>
            <p>{t(s.gdzie)} {t(s.termin)}</p>
          </div>
        ))}
        <p className="small muted">{t("Kwoty i warunki warto potwierdzić w ZUS lub w urzędzie przed złożeniem wniosku.")}</p>
      </>}
    </section>
  );
}

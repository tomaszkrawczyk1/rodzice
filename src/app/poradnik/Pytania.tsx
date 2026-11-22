"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { KATEGORIE, PYTANIA, kalkulatorLink, pytanie, type Pytanie } from "@/content/poradnik";
import { pytanieWJezyku } from "@/content/poradnik-i18n";
import { useJezyk, useT } from "@/lib/jezyk";
import { Alert } from "@/components/ui";
import { Wstaw } from "@/components/Wstaw";
import { zPojeciami } from "@/components/Pojecie";
import { PODMIOTY_WSPARCIA, telHref } from "@/lib/wsparcie";
import { RODZIC_PO_LUDZKU, krotkiAdres } from "@/lib/kontakty";

/** Pytanie F26 („Gdzie szukać wsparcia”): zamiast samych nazw pokazujemy sprawdzone telefony i strony. */
function KontaktyWsparcia() {
  const t = useT();
  return (
    <>
      <h4>{t("Telefony i strony organizacji")}</h4>
      <ul className="clean">
        {PODMIOTY_WSPARCIA.map((x) => (
          <li key={x.id} className="mt">
            <b>{x.nazwa}</b>{x.opis ? <> – {t(x.opis)}</> : null}<br />
            {x.telefon && <><a href={telHref(x.telefon)}>{t("tel.")} {x.telefon}</a>{x.godziny ? ` (${t(x.godziny)})` : ""} · </>}
            <a href={x.www} target="_blank" rel="noopener noreferrer">{krotkiAdres(x.www)}</a>
            {x.pewnosc === "do_potwierdzenia" && <span className="small muted"> · {t("numer do potwierdzenia przed telefonem")}</span>}
          </li>
        ))}
        {RODZIC_PO_LUDZKU.www && (
          <li className="mt"><b>{RODZIC_PO_LUDZKU.nazwa}</b> – {t(RODZIC_PO_LUDZKU.opis)}<br />
            <a href={RODZIC_PO_LUDZKU.www} target="_blank" rel="noopener noreferrer">{krotkiAdres(RODZIC_PO_LUDZKU.www)}</a></li>
        )}
      </ul>
      <p className="small muted mt">{t("Więcej, także o tym, co przysługuje w trudnej sytuacji:")} <Link href="/trudne">{t("Pomoc w trudnej sytuacji")}</Link>.</p>
    </>
  );
}

function Karta({ p, open, onToggle, przepisy, pokaz }: { p: Pytanie; open: boolean; onToggle: (o: boolean) => void; przepisy: string[]; pokaz: (id: string) => void }) {
  const { t, jezyk } = useJezyk();
  const k = kalkulatorLink(p.kalkulator);
  const luka = p.status === "luka";
  // Każde trudne pojęcie objaśniamy raz na kartę – przy pierwszym użyciu.
  const uzyte = new Set<string>();
  return (
    <details id={p.id} className="dl faq" open={open} onToggle={(e) => onToggle((e.target as HTMLDetailsElement).open)}>
      <summary>{p.pytanie}</summary>
      {p.status !== "ok" && <Alert t="warn">
        {p.id === "F26" ? t("Dane kontaktowe sprawdziliśmy na stronach organizacji. Zanim zadzwonisz, upewnij się, że numer i godziny się nie zmieniły.") : <>{t("Sprawdź szczegóły w ZUS.")} <Link href="/pue">{t("Zobacz, jak zadać pytanie")}</Link></>}
      </Alert>}
      {!luka && <p className="mt">{zPojeciami(p.odpowiedz, uzyte)}</p>}
      {!luka && p.kroki && p.kroki.length > 0 && (<><h4>{t("Co zrobić krok po kroku")}</h4><ol className="steps">{p.kroki.map((s, i) => <li key={i}>{zPojeciami(s, uzyte)}</li>)}</ol></>)}
      {!luka && p.id === "F26" && <KontaktyWsparcia />}
      {!luka && p.uwaga && p.id !== "F26" && <p className="small muted mt">{zPojeciami(t(p.uwaga), uzyte)}</p>}
      <div className="row mt no-print">
        {!luka && p.druki?.map((d) => <Link key={d} className="btn btn-secondary btn-sm" href={`/druki#${d}`}>{t("Formularz {id}", { id: d })}</Link>)}
        {!luka && k && <Link className="btn btn-primary btn-sm" href={k.href}>{t(k.etykieta)}</Link>}
      </div>
      {p.powiazane && p.powiazane.length > 0 && (
        <p className="small mt"><b>{t("Zobacz też powiązane tematy:")}</b> {p.powiazane.map((id) => { const pp = pytanie(id); return pp && <a key={id} href={`#${id}`} onClick={() => pokaz(id)} style={{ marginRight: 10 }}>{pytanieWJezyku(pp, jezyk).pytanie}</a>; })}</p>
      )}
      {przepisy.length > 0 && <details className="dl"><summary>{t("Zobacz przepisy")}</summary><ul>{przepisy.map((z) => <li key={z}>{t(z)}</li>)}</ul></details>}
    </details>
  );
}

export default function Pytania({ przepisy }: { przepisy: Record<string, string[]> }) {
  const { t, jezyk } = useJezyk();
  const [kat, setKat] = useState("");
  const [q, setQ] = useState("");
  const [otw, setOtw] = useState<Record<string, boolean>>({});
  function pokaz(id: string) {
    if (!pytanie(id)) return;
    setKat("");
    setQ("");
    setOtw((x) => ({ ...x, [id]: true }));
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
  }
  useEffect(() => {
    const otworzZAdresu = () => pokaz(location.hash.slice(1));
    otworzZAdresu();
    window.addEventListener("hashchange", otworzZAdresu);
    return () => window.removeEventListener("hashchange", otworzZAdresu);
  }, []);
  const lista = useMemo(() => {
    const s = q.trim().toLowerCase();
    return PYTANIA.map((p) => pytanieWJezyku(p, jezyk)).filter((p) => (!kat || p.kategoria === kat) && (!s || (p.pytanie + " " + p.odpowiedz).toLowerCase().includes(s)));
  }, [kat, q, jezyk]);
  return (
    <>
      <h1>{t("Pytania i odpowiedzi (FAQ)")}</h1>
      <p className="lead"><Wstaw tekst={t("Najczęstsze pytania rodziców o zasiłki, urlopy i wnioski – z prostymi odpowiedziami, instrukcjami krok po kroku i potrzebnymi formularzami. Trudne słowa z przepisów są {podkreslone} – kliknij je, a wyjaśnimy je prościej. Nie wiesz, od czego zacząć? {link} – odpowiesz na kilka prostych pytań i dowiesz się, co przysługuje w Twojej sytuacji.")} wartosci={{ podkreslone: <b>{t("podkreślone")}</b>, link: <Link href="/kreator">{t("Uruchom kreator spraw")}</Link> }} /></p>
      <div className="card">
        <div className="field"><label htmlFor="szukaj">{t("Wyszukaj w poradniku")}</label><input id="szukaj" type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("np. urlop ojcowski, 81,5%, zwolnienie lekarskie")} /></div>
        <div className="tabs" role="group" aria-label={t("Kategorie")}>
          <button className={"tab" + (!kat ? " on" : "")} onClick={() => setKat("")}>{t("Wszystkie tematy ({n})", { n: PYTANIA.length })}</button>
          {KATEGORIE.map((c) => <button key={c.id} className={"tab" + (kat === c.id ? " on" : "")} onClick={() => setKat(c.id)}>{t(c.nazwa)} ({PYTANIA.filter((p) => p.kategoria === c.id).length})</button>)}
        </div>
      </div>
      <div className="mt" aria-live="polite">
        {lista.length === 0 && <p className="muted">{t("Nie znaleźliśmy odpowiedzi dla tego hasła. Spróbuj zadać pytanie innymi słowami albo wybierz kategorię powyżej.")}</p>}
        {lista.map((p) => <Karta key={p.id} p={p} open={!!otw[p.id]} przepisy={przepisy[p.id] ?? []} pokaz={pokaz} onToggle={(o) => setOtw((x) => ({ ...x, [p.id]: o }))} />)}
      </div>
      <p className="small muted mt">{t("Odpowiedzi opracowano na podstawie Kodeksu pracy i ustawy o świadczeniach pieniężnych z ubezpieczenia społecznego. Treści mają charakter informacyjny i nie stanowią oficjalnej decyzji ZUS.")}</p>
    </>
  );
}

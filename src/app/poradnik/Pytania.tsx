"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { KATEGORIE, PYTANIA, kalkulatorLink, pytanie, type Pytanie } from "@/content/poradnik";
import { pytanieWJezyku } from "@/content/poradnik-i18n";
import { useJezyk } from "@/lib/jezyk";
import { Alert } from "@/components/ui";
import { Wstaw } from "@/components/Wstaw";

function Karta({ p, open, onToggle, przepisy, pokaz }: { p: Pytanie; open: boolean; onToggle: (o: boolean) => void; przepisy: string[]; pokaz: (id: string) => void }) {
  const { t, jezyk } = useJezyk();
  const k = kalkulatorLink(p.kalkulator);
  const luka = p.status === "luka";
  return (
    <details id={p.id} className="dl faq" open={open} onToggle={(e) => onToggle((e.target as HTMLDetailsElement).open)}>
      <summary>{p.pytanie}</summary>
      {p.status !== "ok" && <Alert t="warn">
        {p.id === "F26" ? t("Sprawdź aktualne informacje bezpośrednio w wybranej organizacji.") : <>{t("Sprawdź szczegóły w ZUS.")} <Link href="/pue">{t("Zobacz, jak zadać pytanie")}</Link></>}
      </Alert>}
      {!luka && <p className="mt">{p.odpowiedz}</p>}
      {!luka && p.kroki && p.kroki.length > 0 && (<><h4>{t("Co zrobić krok po kroku")}</h4><ol className="steps">{p.kroki.map((s, i) => <li key={i}>{s}</li>)}</ol></>)}
      <div className="row mt no-print">
        {!luka && p.druki?.map((d) => <Link key={d} className="btn btn-secondary btn-sm" href={`/druki#${d}`}>{t("Formularz {id}", { id: d })}</Link>)}
        {!luka && k && <Link className="btn btn-primary btn-sm" href={k.href}>{t(k.etykieta)}</Link>}
      </div>
      {p.powiazane && p.powiazane.length > 0 && (
        <p className="small mt"><b>{t("Zobacz też powiązane tematy:")}</b> {p.powiazane.map((id) => { const pp = pytanie(id); return pp && <a key={id} href={`#${id}`} onClick={() => pokaz(id)} style={{ marginRight: 10 }}>{pytanieWJezyku(pp, jezyk).pytanie}</a>; })}</p>
      )}
      {przepisy.length > 0 && <details className="dl"><summary>{t("Zobacz przepisy")}</summary><ul>{przepisy.map((z) => <li key={z}>{z}</li>)}</ul></details>}
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
      <h1>{t("Poradnik rodzica: pytania i odpowiedzi")}</h1>
      <p className="lead"><Wstaw tekst={t("Proste odpowiedzi, instrukcje krok po kroku i potrzebne formularze. Nie wiesz, od czego zacząć? {link} – odpowiesz na kilka prostych pytań i dowiesz się, co przysługuje w Twojej sytuacji.")} wartosci={{ link: <Link href="/kreator">{t("Uruchom kreator spraw")}</Link> }} /></p>
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

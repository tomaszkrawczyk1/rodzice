"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/sesja";
import { dzis } from "@/lib/format";
import { useFormaty, useJezyk, useT } from "@/lib/jezyk";
import { Wstaw } from "@/components/Wstaw";
import { pytanie } from "@/content/poradnik";
import { pytanieWJezyku } from "@/content/poradnik-i18n";
import { Alert, Field } from "@/components/ui";

type Wynik = { tygodnie: number; od: string; do: string; kwotaMiesieczna: number; kwotaRazem: number };

/** Data + n miesięcy (np. 31 stycznia + 1 = 28/29 lutego). */
function plusMiesiace(iso: string, n: number) {
  const [r, m, d] = iso.split("-").map(Number);
  const ostatni = new Date(Date.UTC(r, m - 1 + n + 1, 0)).getUTCDate();
  return new Date(Date.UTC(r, m - 1 + n, Math.min(d, ostatni))).toISOString().slice(0, 10);
}

// Świadczenie rodzicielskie („kosiniakowe”) liczone na miejscu w kreatorze – dla osób bez zasiłku macierzyńskiego.
// Źródło zasad: F21 w faq.json i /api/oblicz/swiadczenie-rodzicielskie.
export default function SwiadczenieRodzicielskie({ planowane }: { planowane?: boolean }) {
  const t = useT();
  const { jezyk } = useJezyk();
  const { dataPL, pln, tygodnie } = useFormaty();
  const [data, setData] = useState("");
  const [dzieci, setDzieci] = useState("1");
  const [wynik, setWynik] = useState<Wynik | null>(null);
  const [blad, setBlad] = useState("");
  const [liczy, setLiczy] = useState(false);
  const f21 = pytanie("F21");
  const kroki = (f21 ? pytanieWJezyku(f21, jezyk).kroki : undefined) ?? [];

  async function policz(e: React.FormEvent) {
    e.preventDefault();
    if (!data) { setBlad(t(planowane ? "Wpisz planowany termin porodu." : "Wpisz datę urodzenia dziecka.")); return; }
    setBlad(""); setLiczy(true);
    try { setWynik(await api<Wynik>("/api/oblicz/swiadczenie-rodzicielskie", { liczbaDzieci: Number(dzieci), odDnia: data })); }
    catch (err) { setBlad(t(err instanceof Error ? err.message : "Nie udało się policzyć. Spróbuj jeszcze raz.")); setWynik(null); }
    finally { setLiczy(false); }
  }

  const termin = data ? plusMiesiace(data, 3) : "";
  const poTerminie = !!termin && termin < dzis();

  return (
    <div className="kreator-blok">
      <h3>{t("Świadczenie rodzicielskie – co zrobić")}</h3>
      <ol className="kreator-kroki">
        {kroki.map((k) => <li key={k}>{k}</li>)}
      </ol>
      <p><Wstaw tekst={t("Wniosek składasz w {urzad} (zwykle w ośrodku pomocy społecznej), nie w ZUS. Możesz to zrobić także przez internet.")} wartosci={{ urzad: <b>{t("urzędzie gminy lub miasta")}</b> }} /></p>

      <form onSubmit={policz} className="kreator-formularz" noValidate>
        <h4>{t("Policz, ile dostaniesz")}</h4>
        <Field label={planowane ? "Planowany termin porodu" : "Kiedy urodziło się dziecko?"}>
          <input type="date" value={data} onChange={(e) => { setData(e.target.value); setWynik(null); }} />
        </Field>
        <Field label="Ile dzieci urodziło się przy jednym porodzie?">
          <select value={dzieci} onChange={(e) => { setDzieci(e.target.value); setWynik(null); }}>
            <option value="1">{t("Jedno")}</option><option value="2">{t("Dwoje")}</option><option value="3">{t("Troje")}</option><option value="4">{t("Czworo")}</option><option value="5">{t("Pięcioro lub więcej")}</option>
          </select>
        </Field>
        <button type="submit" className="btn btn-primary kreator-duzy" disabled={liczy}>{liczy ? t("Liczę…") : t("Policz świadczenie")}</button>
        {blad && <Alert t="err">{t(blad)}</Alert>}
      </form>

      {wynik && <div aria-live="polite">
        <Alert t="ok">
          <p><Wstaw tekst={t("{kwota} miesięcznie przez {tyg} (od {od} do {do}).")} wartosci={{ kwota: <b>{pln(wynik.kwotaMiesieczna)}</b>, tyg: tygodnie(wynik.tygodnie), od: dataPL(wynik.od), do: dataPL(wynik.do) }} /></p>
          <p><Wstaw tekst={t("Razem około {kwota}.")} wartosci={{ kwota: <b>{pln(wynik.kwotaRazem)}</b> }} /></p>
        </Alert>
        {poTerminie
          ? <Alert t="warn">{t("Minęły już 3 miesiące od urodzenia. Złóż wniosek jak najszybciej – pieniądze dostaniesz od miesiąca, w którym go złożysz.")}</Alert>
          : <Alert><Wstaw tekst={t("Złóż wniosek do {data} – wtedy dostaniesz pieniądze od miesiąca urodzenia dziecka.")} wartosci={{ data: <b>{dataPL(termin)}</b> }} /></Alert>}
      </div>}
      <p className="small muted">{t("Świadczenie nie przysługuje, jeśli któreś z rodziców pobiera za ten czas zasiłek macierzyński.")} <Link href="/poradnik#F21">{t("Więcej w poradniku")}</Link></p>
    </div>
  );
}

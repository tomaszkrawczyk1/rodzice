"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/sesja";
import { dataPL, dzis, pln, tygodnie } from "@/lib/format";
import { pytanie } from "@/content/poradnik";
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
  const [data, setData] = useState("");
  const [dzieci, setDzieci] = useState("1");
  const [wynik, setWynik] = useState<Wynik | null>(null);
  const [blad, setBlad] = useState("");
  const [liczy, setLiczy] = useState(false);
  const kroki = pytanie("F21")?.kroki ?? [];

  async function policz(e: React.FormEvent) {
    e.preventDefault();
    if (!data) { setBlad(planowane ? "Wpisz planowany termin porodu." : "Wpisz datę urodzenia dziecka."); return; }
    setBlad(""); setLiczy(true);
    try { setWynik(await api<Wynik>("/api/oblicz/swiadczenie-rodzicielskie", { liczbaDzieci: Number(dzieci), odDnia: data })); }
    catch (err) { setBlad(err instanceof Error ? err.message : "Nie udało się policzyć. Spróbuj jeszcze raz."); setWynik(null); }
    finally { setLiczy(false); }
  }

  const termin = data ? plusMiesiace(data, 3) : "";
  const poTerminie = !!termin && termin < dzis();

  return (
    <div className="kreator-blok">
      <h3>Świadczenie rodzicielskie – co zrobić</h3>
      <ol className="kreator-kroki">
        {kroki.map((k) => <li key={k}>{k}</li>)}
      </ol>
      <p>Wniosek składasz w <b>urzędzie gminy lub miasta</b> (zwykle w ośrodku pomocy społecznej), nie w ZUS. Możesz to zrobić także przez internet.</p>

      <form onSubmit={policz} className="kreator-formularz" noValidate>
        <h4>Policz, ile dostaniesz</h4>
        <Field label={planowane ? "Planowany termin porodu" : "Kiedy urodziło się dziecko?"}>
          <input type="date" value={data} onChange={(e) => { setData(e.target.value); setWynik(null); }} />
        </Field>
        <Field label="Ile dzieci urodziło się przy jednym porodzie?">
          <select value={dzieci} onChange={(e) => { setDzieci(e.target.value); setWynik(null); }}>
            <option value="1">Jedno</option><option value="2">Dwoje</option><option value="3">Troje</option><option value="4">Czworo</option><option value="5">Pięcioro lub więcej</option>
          </select>
        </Field>
        <button type="submit" className="btn btn-primary kreator-duzy" disabled={liczy}>{liczy ? "Liczę…" : "Policz świadczenie"}</button>
        {blad && <Alert t="err">{blad}</Alert>}
      </form>

      {wynik && <div aria-live="polite">
        <Alert t="ok">
          <p><b>{pln(wynik.kwotaMiesieczna)} miesięcznie</b> przez {tygodnie(wynik.tygodnie)} (od {dataPL(wynik.od)} do {dataPL(wynik.do)}).</p>
          <p>Razem około <b>{pln(wynik.kwotaRazem)}</b>.</p>
        </Alert>
        {poTerminie
          ? <Alert t="warn">Minęły już 3 miesiące od urodzenia. Złóż wniosek jak najszybciej – pieniądze dostaniesz od miesiąca, w którym go złożysz.</Alert>
          : <Alert>Złóż wniosek <b>do {dataPL(termin)}</b> – wtedy dostaniesz pieniądze od miesiąca urodzenia dziecka.</Alert>}
      </div>}
      <p className="small muted">Świadczenie nie przysługuje, jeśli któreś z rodziców pobiera za ten czas zasiłek macierzyński. <Link href="/poradnik#F21">Więcej w poradniku</Link></p>
    </div>
  );
}

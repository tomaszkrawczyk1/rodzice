"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/sesja";
import { dataPL, dataKrotka } from "@/lib/format";
import { DRUKI } from "@/content/tresci";
import { Alert, Field } from "@/components/ui";

const ETY: Record<string, string> = { wniosek_pelny_wymiar_81_5_po_porodzie: "Wniosek o wariant 81,5% – dni po porodzie", wniosek_urlop_rodzicielski_przed_startem: "Wniosek o urlop rodzicielski – dni przed startem", wniosek_laczenie_z_praca_przed_startem: "Wniosek o łączenie pracy z urlopem – dni przed startem" };
export default function Dokumenty() {
  const [f, setF] = useState<any>({ tytul: "umowa_o_prace", platnik: 50 });
  const [ter, setTer] = useState<any[] | null>(null); const [par, setPar] = useState<any>(null); const [kto, setKto] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => { api("/api/parametry").then(setPar).catch(() => {}); }, []);
  useEffect(() => {
    api("/api/oblicz/uprawnienia", { tytul: f.tytul, dobrowolneChorobowe: true, dniNieprzerwanegoUbezpieczeniaChorobowego: 400, ubezpieczonaWDniuPorodu: true, liczbaUbezpieczonychPlatnika: +f.platnik }).then(setKto).catch(() => {});
  }, [f]);
  useEffect(() => {
    let wej: any; try { wej = JSON.parse(localStorage.getItem("rodzice.plan") || "null")?.wejscie; } catch {}
    if (!wej) return setTer(null);
    api("/api/oblicz/terminy", { wejscie: wej }).then(setTer).catch((e) => setErr(e.message));
  }, []);
  const prac = f.tytul === "umowa_o_prace"; const duzy = prac && +f.platnik > 20;
  return (
    <>
      <h1>Dokumenty i terminy</h1>
      <p className="lead">Kto wypłaca zasiłek, jaki druk wypełnić, gdzie go złożyć i do kiedy – zależnie od tego, na jakiej podstawie jesteś ubezpieczona.</p>
      <div className="grid g2" style={{ alignItems: "start" }}>
        <div className="card">
          <h3>Dla kogo?</h3>
          <Field label="Tytuł ubezpieczenia"><select value={f.tytul} onChange={(e) => setF({ ...f, tytul: e.target.value })}><option value="umowa_o_prace">Umowa o pracę</option><option value="zlecenie">Umowa zlecenie</option><option value="dzialalnosc">Działalność gospodarcza</option></select></Field>
          {prac && <Field label="Liczba ubezpieczonych zgłaszanych przez pracodawcę" hint="Pracodawca zgłaszający powyżej 20 osób sam ustala i wypłaca zasiłki"><input type="number" value={f.platnik} onChange={(e) => setF({ ...f, platnik: e.target.value })} /></Field>}
          <Alert t={duzy ? "ok" : "info"}>{duzy ? <>Zasiłek ustala i <b>wypłaca pracodawca</b>. Wniosek o zasiłek (ZAM) i o urlop składasz <b>do pracodawcy</b>. Druk Z-3 nie jest potrzebny.</> : prac ? <>Pracodawca przyjmuje wniosek, a zasiłek ustala i wypłaca <b>ZUS</b>. Pracodawca przekazuje do ZUS zaświadczenie <b>Z-3</b> z danymi o Twoich zarobkach.</> : f.tytul === "zlecenie" ? <>Zasiłek ustala i wypłaca <b>ZUS</b>. Składasz <b>ZAM do ZUS</b>, a płatnik składek przekazuje zaświadczenie <b>Z-3a</b>.</> : <>Zasiłek ustala i wypłaca <b>ZUS</b>. Składasz <b>ZAM do ZUS</b> (przedsiębiorca nie składa dodatkowo zaświadczenia płatnika). Pamiętaj o spłacie zadłużenia składkowego.</>}</Alert>
          {kto && <p className="small muted">Silnik: wypłaca <b>{kto.ktoWyplaca}</b>.</p>}
        </div>
        <div className="card">
          <h3>Twoje terminy</h3>
          {err && <Alert t="err">{err}</Alert>}
          {ter ? <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Co</th><th>Do kiedy</th><th>Podstawa</th></tr></thead><tbody>
            {ter.map((t, i) => <tr key={i}><td>{t.co}</td><td>{t.do ? dataPL(t.do) : t.od ? `od ${dataPL(t.od)}` : "—"}</td><td className="small muted">{t.podstawa}</td></tr>)}</tbody></table></div>
            : <Alert>Terminy zależą od Twojego planu urlopów. <Link href="/kalkulator">Policz zasiłek w kalkulatorze</Link>, a pokażemy tu terminy co do dnia.</Alert>}
          {par && <><h4 className="mt">Terminy ustawowe (z ustawień)</h4><ul className="clean">{Object.entries(par.terminy_dni).map(([k, v]) => <li key={k}>{ETY[k] ?? k.replaceAll("_", " ")}: <b>{String(v)}</b> dni</li>)}</ul></>}
        </div>
      </div>
      <h2 className="mt">Druki i wnioski</h2>
      <div className="grid g2">{DRUKI.map((d) => <div key={d.kod} className="card"><div className="row between"><h3>{d.kod}</h3><span className="badge ok">{d.kto}</span></div><b>{d.nazwa}</b><p className="small muted">{d.opis}</p></div>)}</div>
      <div className="row mt"><Link href="/wnioski" className="btn btn-primary">Wypełnij wniosek</Link><Link href="/wgraj" className="btn btn-secondary">Wgraj gotowy wniosek</Link></div>
    </>
  );
}

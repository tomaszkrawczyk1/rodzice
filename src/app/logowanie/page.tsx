"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, useSesja } from "@/lib/sesja";
import { PERSONA_OPIS } from "@/content/tresci";
import { Alert, Spin } from "@/components/ui";

export default function Logowanie() {
  const router = useRouter(); const { zaloguj } = useSesja();
  const [krok, setKrok] = useState(1); const [persony, setPersony] = useState<any[]>([]); const [wyb, setWyb] = useState<any>(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { api("/api/personas").then(setPersony).catch((e) => setErr(e.message)); }, []);
  async function potwierdz() {
    setBusy(true); setErr("");
    try { const s = await api("/api/auth/mobywatel", { personaId: wyb.id }); zaloguj(s); router.push("/"); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <div className="mobywatel">
      <div className="logo">mObywatel</div>
      <div className="card" style={{ textAlign: "left" }}>
        <p><span className="badge sim">symulacja</span> To atrapa logowania – nic nie jest przesyłane do prawdziwego mObywatela.</p>
        {krok === 1 && <>
          <h2>Zaloguj się</h2><p className="muted">Zaloguj się, aby aplikacja pobrała Twoje dane o ubezpieczeniu z ZUS (dane testowe).</p>
          <button className="btn btn-primary" style={{ width: "100%", background: "#d0021b" }} onClick={() => setKrok(2)}>Zaloguj przez mObywatela</button>
          <p className="small muted mt">Wolisz nie logować się? <a href="/kalkulator">Wpisz dane ręcznie w kalkulatorze</a>.</p></>}
        {krok === 2 && <>
          <h2>Wybierz profil testowy</h2>
          {err && <Alert t="err">{err}</Alert>}
          {persony.map((p) => <button key={p.id} className="persona" onClick={() => { setWyb(p); setKrok(3); }}><b>{p.osoba}</b><br /><span className="small muted">{PERSONA_OPIS[p.id] ?? p.tytul}</span></button>)}</>}
        {krok === 3 && wyb && <>
          <h2>Zgoda na udostępnienie danych</h2>
          <p>Aplikacja <b>Przewodnik Przyszłego Rodzica</b> prosi o dostęp do danych: <b>{wyb.osoba}</b>, PESEL {wyb.pesel} (fikcyjny), informacje o ubezpieczeniu chorobowym, zwolnieniach e-ZLA i stanie zadłużenia składkowego w ZUS.</p>
          {err && <Alert t="err">{err}</Alert>}
          <div className="row"><button className="btn btn-primary" onClick={potwierdz} disabled={busy}>{busy ? <Spin /> : "Zgadzam się i loguję"}</button><button className="btn btn-ghost" onClick={() => setKrok(2)}>Wstecz</button></div></>}
      </div>
    </div>
  );
}

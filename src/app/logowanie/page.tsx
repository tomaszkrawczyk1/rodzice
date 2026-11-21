"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, useSesja, type Sesja } from "@/lib/sesja";
import { nazwaUbezpieczenia } from "@/lib/dane-profilu";
import { PERSONA_OPIS } from "@/content/tresci";
import { Alert } from "@/components/ui";

type Profil = { id: string; osoba: string; pesel: string; tytul?: string };

export default function Logowanie() {
  const router = useRouter();
  const { zaloguj } = useSesja();
  const [krok, setKrok] = useState(1);
  const [persony, setPersony] = useState<Profil[] | null>(null);
  const [wybrany, setWybrany] = useState<Profil | null>(null);
  const [bladListy, setBladListy] = useState(false);
  const [bladLogowania, setBladLogowania] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Profil[]>("/api/personas").then(setPersony).catch(() => setBladListy(true));
  }, []);

  async function potwierdz() {
    if (!wybrany) return;
    setBusy(true);
    setBladLogowania(false);
    try {
      const sesja = await api<Sesja>("/api/auth/mobywatel", { personaId: wybrany.id });
      zaloguj(sesja);
      router.push(new URLSearchParams(location.search).get("powrot") === "pue" ? "/pue" : "/");
    } catch {
      setBladLogowania(true);
      setBusy(false);
    }
  }

  return (
    <div className="mobywatel" style={{ textAlign: "left", overflowWrap: "anywhere" }}>
      <h1>Logowanie testowe</h1>
      <p>Wypróbuj logowanie przez mObywatela na fikcyjnym profilu. Wybierz gotową osobę bez wpisywania własnych danych.</p>
      {krok === 1 && <>
        <button className="btn btn-primary" onClick={() => setKrok(2)}>Pokaż profile testowe</button>
        <p className="mt"><Link href="/sprawy">Wybierz sprawę bez logowania</Link></p>
      </>}
      {krok === 2 && <>
        <h2>Wybierz profil testowy</h2>
        {bladListy && <Alert t="err">Nie udało się wczytać profili. Odśwież stronę i spróbuj ponownie.</Alert>}
        {!persony && !bladListy && <p role="status">Wczytujemy profile…</p>}
        {persony?.map((p) => <button key={p.id} className="persona" onClick={() => { setWybrany(p); setBladLogowania(false); setKrok(3); }}>
          <b>{p.osoba}</b><br /><span>{PERSONA_OPIS[p.id] ?? (p.tytul && nazwaUbezpieczenia(p.tytul))}</span>
        </button>)}
      </>}
      {krok === 3 && wybrany && <section className="card">
        <h2>Potwierdź wybór profilu</h2>
        <p>Profil <b>{wybrany.osoba}</b> ma fikcyjny PESEL {wybrany.pesel} oraz przykładowe dane o ubezpieczeniu, zwolnieniach i składkach.</p>
        {bladLogowania && <Alert t="err">Nie udało się zalogować. Spróbuj ponownie.</Alert>}
        <div className="row">
          <button className="btn btn-primary" onClick={potwierdz} disabled={busy}>{busy ? "Logujemy…" : "Zaloguj się na ten profil"}</button>
          <button className="btn btn-ghost" disabled={busy} onClick={() => setKrok(2)}>Zmień profil</button>
        </div>
      </section>}
    </div>
  );
}

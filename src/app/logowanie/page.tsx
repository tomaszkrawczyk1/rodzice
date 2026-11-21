"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, useSesja, type Sesja } from "@/lib/sesja";
import { nazwaUbezpieczenia } from "@/lib/dane-profilu";
import { PERSONA_OPIS } from "@/content/tresci";
import { Alert } from "@/components/ui";
import s from "./logowanie.module.css";

type Profil = { id: string; osoba: string; pesel: string; tytul?: string };

const opisProfilu = (p: Profil) => PERSONA_OPIS[p.id] ?? (p.tytul ? nazwaUbezpieczenia(p.tytul) : "Profil testowy");

export default function Logowanie() {
  const router = useRouter();
  const { zaloguj } = useSesja();
  const [persony, setPersony] = useState<Profil[] | null>(null);
  const [wybrany, setWybrany] = useState<Profil | null>(null);
  const [bladListy, setBladListy] = useState(false);
  const [bladLogowania, setBladLogowania] = useState(false);
  const [busy, setBusy] = useState(false);
  const potwierdzRef = useRef<HTMLElement>(null);
  const tytulRef = useRef<HTMLHeadingElement>(null);
  const bylWybor = useRef(false);

  useEffect(() => {
    api<Profil[]>("/api/personas").then(setPersony).catch(() => setBladListy(true));
  }, []);

  // Po przejściu między widokami przenosimy fokus na nowy nagłówek (czytniki ekranu i klawiatura).
  useEffect(() => {
    if (wybrany) { bylWybor.current = true; potwierdzRef.current?.focus(); }
    else if (bylWybor.current) tytulRef.current?.focus();
  }, [wybrany]);

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
    <div className={s.wrap}>
      <h1 ref={tytulRef} tabIndex={-1} className={s.tytul}>Logowanie testowe</h1>
      <p className={s.lead}>Wypróbuj logowanie przez mObywatela na gotowym profilu. Nie wpisujesz żadnych własnych danych.</p>
      <div className={s.fikcja} role="note">
        <div>
          <span className={s.znacznik}>Fikcyjne dane testowe</span>
          <p style={{ margin: "8px 0 0" }}><b>Wszystkie profile poniżej są wymyślone.</b> Imiona, numery PESEL, umowy i zwolnienia nie należą do prawdziwych osób. To symulacja, nie prawdziwe logowanie.</p>
        </div>
      </div>

      {!wybrany && <section aria-labelledby="profile-h">
        <h2 id="profile-h">Wybierz profil testowy</h2>
        {bladListy && <Alert t="err">Nie udało się wczytać profili. Odśwież stronę i spróbuj ponownie.</Alert>}
        {!persony && !bladListy && <p role="status">Wczytujemy profile…</p>}
        {persony && <ul className={s.lista}>
          {persony.map((p) => (
            <li key={p.id}>
              <button type="button" className={s.karta} onClick={() => { setWybrany(p); setBladLogowania(false); }}>
                <span className={s.imie}>{p.osoba}</span>
                <span className={s.opis}>{opisProfilu(p)}</span>
                <span className={s.meta}>{p.tytul ? `${nazwaUbezpieczenia(p.tytul)} · ` : ""}fikcyjny PESEL {p.pesel}</span>
                <span className={s.wybierz} aria-hidden="true">Wybierz ten profil →</span>
              </button>
            </li>
          ))}
        </ul>}
        <p className={s.stopka}><Link href="/sprawy">Wybierz sprawę bez logowania</Link></p>
      </section>}

      {wybrany && <section ref={potwierdzRef} tabIndex={-1} aria-labelledby="potwierdz-h" className={s.potwierdz}>
        <h2 id="potwierdz-h">Potwierdź wybór profilu</h2>
        <p><span className={s.znacznik}>Fikcyjne dane testowe</span></p>
        <p><b>{wybrany.osoba}</b>: {opisProfilu(wybrany)}.</p>
        <p>Profil ma fikcyjny PESEL {wybrany.pesel} oraz przykładowe dane o ubezpieczeniu, zwolnieniach i składkach.</p>
        {bladLogowania && <Alert t="err">Nie udało się zalogować. Spróbuj ponownie.</Alert>}
        <div className={s.rzad}>
          <button type="button" className="btn btn-primary" onClick={potwierdz} disabled={busy}>{busy ? "Logujemy…" : `Zaloguj się jako ${wybrany.osoba}`}</button>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setWybrany(null)}>Wróć do listy profili</button>
        </div>
      </section>}
    </div>
  );
}

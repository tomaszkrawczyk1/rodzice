"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, useSesja, type Sesja } from "@/lib/sesja";
import { nazwaUbezpieczenia } from "@/lib/dane-profilu";
import { PERSONA_OPIS } from "@/content/tresci";
import { Alert } from "@/components/ui";
import { useT } from "@/lib/jezyk";
import s from "./logowanie.module.css";

type Profil = { id: string; osoba: string; pesel: string; tytul?: string };

const opisProfilu = (p: Profil, t: (pl: string) => string) => t(PERSONA_OPIS[p.id] ?? (p.tytul ? nazwaUbezpieczenia(p.tytul) : "Profil testowy"));

/** Logowanie jednym kliknięciem: kliknięcie karty profilu od razu loguje (bez osobnego ekranu potwierdzenia). */
export default function Logowanie() {
  const t = useT();
  const router = useRouter();
  const { sesja, gotowa, zaloguj } = useSesja();
  const [persony, setPersony] = useState<Profil[] | null>(null);
  const [bladListy, setBladListy] = useState(false);
  const [bladLogowania, setBladLogowania] = useState<string | null>(null);
  const [loguje, setLoguje] = useState<string | null>(null);
  const bladRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<Profil[]>("/api/personas").then(setPersony).catch(() => setBladListy(true));
  }, []);

  useEffect(() => { if (bladLogowania) bladRef.current?.focus(); }, [bladLogowania]);

  async function zalogujJako(p: Profil) {
    setLoguje(p.id);
    setBladLogowania(null);
    try {
      const nowa = await api<Sesja>("/api/auth/mobywatel", { personaId: p.id });
      zaloguj(nowa);
      router.push(new URLSearchParams(location.search).get("powrot") === "pue" ? "/pue" : "/");
    } catch {
      setBladLogowania(p.osoba);
      setLoguje(null);
    }
  }

  return (
    <div className={s.wrap}>
      <h1 className={s.tytul}>{t("Logowanie testowe")}</h1>
      <p className={s.lead}>Wypróbuj logowanie przez mObywatela na gotowym profilu. Kliknij profil, a od razu się zalogujesz. Nie wpisujesz żadnych własnych danych.</p>
      <div className={s.fikcja} role="note">
        <div>
          <span className={s.znacznik}>{t("Fikcyjne dane testowe")}</span>
          <p style={{ margin: "8px 0 0" }}><b>{t("Wszystkie profile poniżej są wymyślone.")}</b> {t("Imiona, numery PESEL, umowy i zwolnienia nie należą do prawdziwych osób. To symulacja, nie prawdziwe logowanie.")}</p>
        </div>
      </div>

      {gotowa && sesja && <Alert t="info">Jesteś zalogowany jako <b>{sesja.osoba}</b>. Kliknij inny profil, żeby się przełączyć.</Alert>}

      <section aria-labelledby="profile-h">
        <h2 id="profile-h">{t("Wybierz profil testowy")}</h2>
        {bladListy && <Alert t="err">{t("Nie udało się wczytać profili. Odśwież stronę i spróbuj ponownie.")}</Alert>}
        {bladLogowania && <div ref={bladRef} tabIndex={-1}><Alert t="err">Nie udało się zalogować jako {bladLogowania}. Spróbuj ponownie.</Alert></div>}
        {loguje && <p role="status">{t("Logujemy…")}</p>}
        {!persony && !bladListy && <p role="status">{t("Wczytujemy profile…")}</p>}
        {persony && <ul className={s.lista}>
          {persony.map((p) => (
            <li key={p.id}>
              <button type="button" className={s.karta} disabled={!!loguje} aria-busy={loguje === p.id || undefined} onClick={() => zalogujJako(p)}>
                <span className={s.imie}>{p.osoba}</span>
                <span className={s.opis}>{opisProfilu(p, t)}</span>
                <span className={s.meta}>{p.tytul ? `${nazwaUbezpieczenia(p.tytul)} · ` : ""}fikcyjny PESEL {p.pesel}</span>
                <span className={s.wybierz} aria-hidden="true">{loguje === p.id ? "Logujemy…" : "Zaloguj się na ten profil →"}</span>
              </button>
            </li>
          ))}
        </ul>}
        <p className={s.stopka}><Link href="/sprawy">{t("Wybierz sprawę bez logowania")}</Link></p>
      </section>
    </div>
  );
}

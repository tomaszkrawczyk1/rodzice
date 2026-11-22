"use client";
import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export interface Sesja { token: string; personaId: string; osoba: string; pesel: string }
/**
 * `gotowa` (alias `gotowe`) = sesja została już odczytana z localStorage. Do tego czasu `sesja` jest null także
 * u zalogowanej osoby (serwer nie zna localStorage), więc komponenty zależne od logowania (np. przycisk
 * Zaloguj/Wyloguj w nagłówku) powinny wtedy nic nie pokazywać, zamiast migać „Zaloguj".
 */
interface Ctx { sesja: Sesja | null; zaloguj: (s: Sesja) => void; wyloguj: () => void; gotowa: boolean; gotowe: boolean }
const C = createContext<Ctx>({ sesja: null, zaloguj: () => {}, wyloguj: () => {}, gotowa: false, gotowe: false });
export const useSesja = () => useContext(C);

const KLUCZ = "rodzice.sesja";

export function SesjaProvider({ children }: { children: ReactNode }) {
  const [sesja, setSesja] = useState<Sesja | null>(null);
  const [gotowa, setGotowa] = useState(false);
  const [wylogowano, setWylogowano] = useState(false);
  const zegar = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    try { const s = localStorage.getItem(KLUCZ); if (s) setSesja(JSON.parse(s)); } catch {}
    setGotowa(true);
    // Wylogowanie lub zalogowanie w innej karcie: ta karta też się aktualizuje.
    const zmiana = (e: StorageEvent) => {
      if (e.key !== KLUCZ) return;
      try { setSesja(e.newValue ? JSON.parse(e.newValue) : null); } catch { setSesja(null); }
    };
    window.addEventListener("storage", zmiana);
    return () => { window.removeEventListener("storage", zmiana); clearTimeout(zegar.current); };
  }, []);

  const zaloguj = (s: Sesja) => {
    setSesja(s);
    setWylogowano(false);
    try { localStorage.setItem(KLUCZ, JSON.stringify(s)); } catch {}
  };
  const wyloguj = () => {
    setSesja(null);
    try { localStorage.removeItem(KLUCZ); } catch {}
    setWylogowano(true);
    clearTimeout(zegar.current);
    zegar.current = setTimeout(() => setWylogowano(false), 6000);
  };

  return (
    <C.Provider value={{ sesja, zaloguj, wyloguj, gotowa, gotowe: gotowa }}>
      {/* Do odczytu sesji chowamy przycisk Zaloguj/Wyloguj z nagłówka (klasa .pue-login), żeby u zalogowanej osoby
          nie mignęło „Zaloguj" po wejściu na stronę. visibility zostawia miejsce, więc nagłówek nie skacze. */}
      {!gotowa && <style>{".pue-login{visibility:hidden}"}</style>}
      {children}
      {/* Krótki komunikat po wylogowaniu. Region role="status" jest zawsze w drzewie, żeby czytnik ekranu go ogłosił. */}
      <div role="status" style={wylogowano ? TOAST : UKRYTY}>
        {wylogowano ? "Wylogowano. Dane profilu testowego zniknęły z tej przeglądarki." : ""}
      </div>
    </C.Provider>
  );
}

const TOAST: CSSProperties = {
  position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 1000,
  width: "max-content", maxWidth: "calc(100vw - 32px)", background: "#00416e", color: "#fff", padding: "12px 18px",
  border: "2px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,.3)", fontWeight: 700, lineHeight: 1.4,
};
const UKRYTY: CSSProperties = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" };

export async function api<T = any>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, body === undefined ? undefined : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Błąd ${r.status}`);
  return j;
}

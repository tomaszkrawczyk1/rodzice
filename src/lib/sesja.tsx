"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface Sesja { token: string; personaId: string; osoba: string; pesel: string }
interface Ctx { sesja: Sesja | null; zaloguj: (s: Sesja) => void; wyloguj: () => void; gotowa: boolean }
const C = createContext<Ctx>({ sesja: null, zaloguj: () => {}, wyloguj: () => {}, gotowa: false });
export const useSesja = () => useContext(C);

export function SesjaProvider({ children }: { children: ReactNode }) {
  const [sesja, setSesja] = useState<Sesja | null>(null);
  const [gotowa, setGotowa] = useState(false);
  useEffect(() => { try { const s = localStorage.getItem("rodzice.sesja"); if (s) setSesja(JSON.parse(s)); } catch {} setGotowa(true); }, []);
  const zaloguj = (s: Sesja) => { setSesja(s); localStorage.setItem("rodzice.sesja", JSON.stringify(s)); };
  const wyloguj = () => { setSesja(null); localStorage.removeItem("rodzice.sesja"); };
  return <C.Provider value={{ sesja, zaloguj, wyloguj, gotowa }}>{children}</C.Provider>;
}

export async function api<T = any>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, body === undefined ? undefined : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Błąd ${r.status}`);
  return j;
}

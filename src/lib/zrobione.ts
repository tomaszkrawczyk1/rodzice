"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Zaznaczone „Zrobione” pozycje osi czasu, zapamiętane w przeglądarce (localStorage).
 * Bez dostępu do localStorage (np. okno prywatne) zaznaczenia działają do odświeżenia strony.
 */
export function useZrobione(klucz: string) {
  const [zrobione, ustaw] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    try {
      const zapis: unknown = JSON.parse(localStorage.getItem(klucz) ?? "[]");
      ustaw(new Set(Array.isArray(zapis) ? zapis.filter((x): x is string => typeof x === "string") : []));
    } catch {
      ustaw(new Set());
    }
  }, [klucz]);

  const przelacz = useCallback((id: string) => {
    ustaw(poprzednie => {
      const nowe = new Set(poprzednie);
      if (!nowe.delete(id)) nowe.add(id);
      try { localStorage.setItem(klucz, JSON.stringify([...nowe])); } catch { /* Działa też bez zapisu w przeglądarce. */ }
      return nowe;
    });
  }, [klucz]);

  return { zrobione, przelacz };
}

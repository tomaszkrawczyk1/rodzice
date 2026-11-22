// Typy dla terminarz.js (moduł jest czystym JS bez zależności, więc typy żyją obok).

export type Rola = "mama" | "tata";
export type Zatrudnienie = "umowa" | "zlecenie" | "jdg" | "brak";
export type Rodzaj = "deadline" | "recommended" | "info";
export type Kategoria = "zus" | "employer" | "municipality" | "usc" | "health" | "tax";

export interface Wejscie {
  birthDate: string;
  role: Rola;
  employment: Zatrudnienie;
  children?: number;
}

export interface Link {
  title: string;
  url: string;
}

export interface Wydarzenie {
  id: string;
  date: string;
  daysFromBirth: number;
  kind: Rodzaj;
  title: string;
  description: string;
  who: string;
  institution: string | null;
  forms: string[];
  links: Link[];
  category: Kategoria;
  verify: boolean;
  isBirth: boolean;
  sources: string[];
}

export interface Opcje {
  formatDate?: (d: Date) => string;
  params?: unknown;
}

export const ROLES: Rola[];
export const EMPLOYMENT: Zatrudnienie[];
export function getPath(obj: unknown, path: string): unknown;
export function buildCalendar(rules: unknown, input: Wejscie, options?: Opcje): Wydarzenie[];
export function toICS(events: Wydarzenie[], options?: { prodId?: string; now?: Date }): string;

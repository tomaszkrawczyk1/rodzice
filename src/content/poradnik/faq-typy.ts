/** Tłumaczenie jednego pytania poradnika. Pola jak w faq.json; brak pola = zostaje polski tekst. */
export type TlumaczeniePytania = { pytanie: string; odpowiedz: string; kroki?: string[] };

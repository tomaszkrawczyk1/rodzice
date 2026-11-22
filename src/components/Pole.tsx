"use client";
import { cloneElement, useId, type ReactElement } from "react";
import css from "./Pole.module.css";
import { useT } from "@/lib/jezyk";

type Dziecko = { id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean | "true" | "false" };

/**
 * Pole formularza: etykieta powiązana z polem (for/id), podpowiedź i komunikat błędu podpięte przez aria-describedby.
 * `error` jest opcjonalny: ustawia aria-invalid i pokazuje komunikat (z tekstem „Błąd:", nie tylko kolorem).
 */
export function Pole({ label, hint, error, children }: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactElement<Dziecko>;
}) {
  const t = useT();
  const uid = useId();
  const id = children.props.id ?? uid;
  const opis = [children.props["aria-describedby"], hint ? `${id}-wskazowka` : "", error ? `${id}-blad` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`field ${css.pole}`}>
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id, "aria-describedby": opis, ...(error ? { "aria-invalid": true } : {}) })}
      {hint && <span id={`${id}-wskazowka`} className="hint">{hint}</span>}
      {error && <span id={`${id}-blad`} className={css.blad}><b>{t("Błąd:")}</b> {t(error)}</span>}
    </div>
  );
}

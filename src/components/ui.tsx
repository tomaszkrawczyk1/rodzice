"use client";
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

export const Alert = ({ t = "info", children }: { t?: "info" | "ok" | "warn" | "err"; children: ReactNode }) => <div className={`alert ${t}`} role={t === "err" ? "alert" : undefined}>{children}</div>;
export const Spin = () => <span className="spin" aria-label="Ładowanie" />;
export const Kroki = ({ kroki, tytul = "Jak to policzono (krok po kroku)" }: { kroki?: string[]; tytul?: string }) =>
  kroki && kroki.length ? <details className="dl"><summary>{tytul}</summary><ol className="steps">{kroki.map((k, i) => <li key={i}>{k}</li>)}</ol></details> : null;
export const Lista = ({ items, warn }: { items?: string[]; warn?: boolean }) => items && items.length ? <ul className={"clean" + (warn ? " warnlist" : "")}>{items.map((x, i) => <li key={i}>{x}</li>)}</ul> : null;

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const uid = useId();
  const hintId = hint ? `${uid}-hint` : undefined;
  const dziecko = isValidElement(children) ? children as ReactElement<{ id?: string; "aria-describedby"?: string }> : null;
  const id = dziecko?.props.id || uid;
  const opis = [hintId, dziecko?.props["aria-describedby"]].filter(Boolean).join(" ") || undefined;
  const pole = dziecko ? cloneElement(dziecko, { id, "aria-describedby": opis }) : children;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {pole}
      {hint && <span id={hintId} className="hint">{hint}</span>}
    </div>
  );
}

export const Sim = () => <span className="badge sim">symulacja</span>;

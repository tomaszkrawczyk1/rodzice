"use client";
import { cloneElement, useId, type ReactElement } from "react";

export function Pole({ label, hint, children }: {
  label: string;
  hint?: string;
  children: ReactElement<{ id?: string; "aria-describedby"?: string }>;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id, "aria-describedby": hint ? `${id}-wskazowka` : undefined })}
      {hint && <span id={`${id}-wskazowka`} className="hint">{hint}</span>}
    </div>
  );
}

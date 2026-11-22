"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import style from "./panel-boczny.module.css";

/**
 * Panel z boku ekranu (szuflada) na krótki opis pozycji. Używa natywnego <dialog>: Esc zamyka,
 * fokus wraca na przycisk, który otworzył panel, a reszta strony jest wtedy nieaktywna.
 * Rodzic pokazuje panel tylko wtedy, gdy ma go otworzyć, i zamyka go w `onZamknij`.
 */
export default function PanelBoczny({ tytul, onZamknij, children }: {
  tytul: string; onZamknij: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTytulu = useId();

  useEffect(() => {
    const okno = ref.current;
    if (okno && !okno.open) okno.showModal();
  }, []);

  return (
    <dialog ref={ref} className={style.panel} aria-labelledby={idTytulu} onClose={onZamknij}
      onClick={e => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
      <div className={style.wnetrze}>
        <div className={style.gora}>
          <h2 id={idTytulu}>{tytul}</h2>
          <button type="button" className="btn btn-ghost" onClick={() => ref.current?.close()}>Zamknij</button>
        </div>
        <div className={style.tresc}>{children}</div>
      </div>
    </dialog>
  );
}

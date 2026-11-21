import type { Status } from "@/content/poradnik";
import { STATUS_OPIS } from "@/content/poradnik";
export const StatusBadge = ({ s }: { s: Status }) =>
  s === "ok" ? null : <span className={"badge " + (s === "luka" ? "no" : "warn")}>{s === "luka" ? "luka w źródłach" : "do potwierdzenia"}</span>;
export const StatusNota = ({ s, uwaga }: { s: Status; uwaga?: string }) =>
  s === "ok" ? null : (
    <div className={"alert " + (s === "luka" ? "err" : "warn")} role="note">
      <b>{s === "luka" ? "Brak rozstrzygnięcia. " : "Sprawdź w ZUS. "}</b>{STATUS_OPIS[s]}
            {s === "luka" && <div className="small mt"><a href="/pue">Zadaj pytanie w PUE (symulacja)</a> lub skontaktuj się z ZUS.</div>}
    </div>
  );

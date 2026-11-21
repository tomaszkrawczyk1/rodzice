// Klient LLM. Model: DeepSeek V4.1 Flash (DeepInfra) – ZAWSZE przez własne proxy z limitem
// (100 zapytań / 1 mln tokenów). Prawdziwy klucz DeepInfra jest tylko na serwerze proxy;
// poniższy token jest PUBLICZNY i działa wyłącznie z tym proxy (patrz proxy/llm-proxy.mjs).
export const LLM_BASE = process.env.LLM_BASE_URL || "https://zxcvbnms.dev/llm/v1";
export const LLM_KEY = process.env.LLM_API_KEY || "rodzice-public-7f3a9c1e5b2d48a6";
export const LLM_MODEL = process.env.LLM_MODEL || "deepseek-ai/DeepSeek-V4.1-Flash-1017";

export interface Uzycie { zapytania: number; tokeny: number }

export async function czat(messages: any[], opts: { maxTokens?: number; uzycie?: Uzycie } = {}): Promise<string> {
  const r = await fetch(`${LLM_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LLM_KEY}` },
    body: JSON.stringify({ model: LLM_MODEL, messages, temperature: 0, max_tokens: opts.maxTokens ?? 3500 }),
    signal: AbortSignal.timeout(170_000),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status === 429 ? "Limit zapytań do modelu AI został wyczerpany (proxy)." : `Błąd modelu AI (${r.status}): ${j?.error?.message || j?.error || ""}`);
  if (opts.uzycie) { opts.uzycie.zapytania++; opts.uzycie.tokeny += j.usage?.total_tokens ?? 0; }
  return j.choices?.[0]?.message?.content ?? "";
}

export function jsonZOdpowiedzi(s: string): any {
  const t = s.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const i = t.indexOf("{"), j = t.lastIndexOf("}");
  if (i < 0 || j < 0) throw new Error("Model nie zwrócił JSON-a.");
  return JSON.parse(t.slice(i, j + 1));
}

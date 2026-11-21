// Publiczne proxy do DeepInfra (DeepSeek V4.1 Flash) z twardym limitem użycia.
// Prawdziwy klucz jest TYLKO w env serwera (DEEPINFRA_API_KEY); klienci używają publicznego tokenu (PUBLIC_TOKEN).
// Limity są ŁĄCZNE (cały czas życia stanu): MAX_REQUESTS zapytań i MAX_TOKENS tokenów. Reset: usuń STATE_FILE.
import http from "node:http";
import fs from "node:fs";

const env = (k, d) => process.env[k] ?? d;
const PORT = +env("PORT", 8787), HOST = env("HOST", "127.0.0.1");
const KEY = env("DEEPINFRA_API_KEY", ""), PUBLIC_TOKEN = env("PUBLIC_TOKEN", "");
const MAX_REQUESTS = +env("MAX_REQUESTS", 100), MAX_TOKENS = +env("MAX_TOKENS", 1_000_000);
const MAX_COMPLETION = +env("MAX_COMPLETION", 8000), MAX_BODY = +env("MAX_BODY_MB", 40) * 1024 * 1024;
const PER_IP_PER_MIN = +env("PER_IP_PER_MIN", 20);
const UPSTREAM = env("UPSTREAM", "https://api.deepinfra.com/v1/openai/chat/completions");
const MODEL = env("MODEL", "deepseek-ai/DeepSeek-V4.1-Flash-1017");
const STATE_FILE = env("STATE_FILE", "./proxy-state.json");
if (!KEY || !PUBLIC_TOKEN) { console.error("Brak DEEPINFRA_API_KEY lub PUBLIC_TOKEN"); process.exit(1); }

let state = { requests: 0, tokens: 0, since: new Date().toISOString() };
try { state = { ...state, ...JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) }; } catch {}
const save = () => { try { fs.writeFileSync(STATE_FILE + ".tmp", JSON.stringify(state)); fs.renameSync(STATE_FILE + ".tmp", STATE_FILE); } catch (e) { console.error("zapis stanu:", e.message); } };
const hits = new Map();
const json = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
const err = (res, code, msg, type = "proxy_error") => json(res, code, { error: { message: msg, type } });

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/health") return json(res, 200, { ok: true });
  if (url.pathname === "/v1/usage") return json(res, 200, { requests: state.requests, maxRequests: MAX_REQUESTS, tokens: state.tokens, maxTokens: MAX_TOKENS, since: state.since });
  if (url.pathname === "/v1/models") return json(res, 200, { object: "list", data: [{ id: MODEL, object: "model" }] });
  if (url.pathname !== "/v1/chat/completions" || req.method !== "POST") return err(res, 404, "Nie znaleziono");
  if (req.headers.authorization !== `Bearer ${PUBLIC_TOKEN}`) return err(res, 401, "Nieprawidłowy token", "auth_error");

  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "?").toString().split(",")[0].trim();
  const now = Date.now(); const arr = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  if (arr.length >= PER_IP_PER_MIN) return err(res, 429, "Za dużo zapytań z tego adresu – spróbuj za minutę.", "rate_limit");
  arr.push(now); hits.set(ip, arr);
  if (state.requests >= MAX_REQUESTS || state.tokens >= MAX_TOKENS) return err(res, 429, `Limit proxy wyczerpany (${state.requests}/${MAX_REQUESTS} zapytań, ${state.tokens}/${MAX_TOKENS} tokenów).`, "quota_exceeded");

  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > MAX_BODY) return err(res, 413, "Za duże żądanie"); chunks.push(c); }
  let b; try { b = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return err(res, 400, "Niepoprawny JSON"); }
  if (!Array.isArray(b.messages) || !b.messages.length) return err(res, 400, "Brak messages");

  const body = { model: MODEL, messages: b.messages, temperature: typeof b.temperature === "number" ? b.temperature : 0,
    max_tokens: Math.min(+b.max_tokens || 2000, MAX_COMPLETION), stream: false };
  if (b.response_format) body.response_format = b.response_format;

  state.requests++; save();           // zliczamy zapytanie przed wysłaniem (ochrona przed nadużyciem)
  try {
    const up = await fetch(UPSTREAM, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(165_000) });
    const text = await up.text();
    try { const j = JSON.parse(text); state.tokens += j.usage?.total_tokens || 0; save(); } catch {}
    res.writeHead(up.status, { "Content-Type": up.headers.get("content-type") || "application/json" }); res.end(text);
  } catch (e) { err(res, 502, "Błąd połączenia z dostawcą modelu: " + e.message, "upstream_error"); }
}).listen(PORT, HOST, () => console.log(`llm-proxy ${HOST}:${PORT} limit ${MAX_REQUESTS} zapytań / ${MAX_TOKENS} tokenów, stan: ${state.requests}/${state.tokens}`));

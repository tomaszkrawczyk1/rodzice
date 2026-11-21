// Odbiornik webhooka GitHub: po pushu na main uruchamia deploy/deploy-server.sh (build na serwerze, restart usługi).
// Bez zależności. Podpis HMAC-SHA256 (X-Hub-Signature-256), sekret w HOOK_SECRET. Jeden deploy naraz, kolejny push w trakcie = jeden dodatkowy przebieg.
import http from "node:http";
import crypto from "node:crypto";
import { spawn } from "node:child_process";

const SECRET = process.env.HOOK_SECRET || "";
const PORT = Number(process.env.PORT || 8788);
const SCRIPT = process.env.DEPLOY_SCRIPT || "/home/srv/rodzice/src/deploy/deploy-server.sh";
let running = false, again = false;

function deploy() {
  if (running) { again = true; return; }
  running = true;
  console.log(new Date().toISOString(), "deploy start");
  const p = spawn("bash", [SCRIPT], { stdio: "inherit" });
  p.on("exit", (code) => {
    console.log(new Date().toISOString(), "deploy koniec, kod", code);
    running = false;
    if (again) { again = false; deploy(); }
  });
}

http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/hook") { res.writeHead(404).end(); return; }
  const chunks = [];
  req.on("data", (c) => { chunks.push(c); if (Buffer.concat(chunks).length > 5e6) req.destroy(); });
  req.on("end", () => {
    const body = Buffer.concat(chunks);
    const sig = String(req.headers["x-hub-signature-256"] || "");
    const exp = "sha256=" + crypto.createHmac("sha256", SECRET).update(body).digest("hex");
    const ok = SECRET && sig.length === exp.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp));
    if (!ok) { res.writeHead(401).end("bad signature"); return; }
    const ev = req.headers["x-github-event"];
    if (ev === "ping") { res.writeHead(200).end("pong"); return; }
    let ref = ""; try { ref = JSON.parse(body.toString()).ref; } catch {}
    if (ev === "push" && ref === "refs/heads/main") { deploy(); res.writeHead(202).end("deploy"); }
    else res.writeHead(200).end("ignored");
  });
}).listen(PORT, "127.0.0.1", () => console.log("hook na", PORT));

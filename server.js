const http = require("node:http");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT) || 3000;
const host = "0.0.0.0";
const leaderboardPath = path.join(root, ".data", "leaderboard.json");
let leaderboardQueue = Promise.resolve();

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function sendJson(res, status, body) {
  send(res, status, JSON.stringify(body), "application/json; charset=utf-8");
}

function cleanName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .slice(0, 24);
}

async function readLeaderboard() {
  try {
    const content = await fsp.readFile(leaderboardPath, "utf8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLeaderboard(entries) {
  await fsp.mkdir(path.dirname(leaderboardPath), { recursive: true });
  await fsp.writeFile(leaderboardPath, JSON.stringify(entries, null, 2));
}

function rankEntries(entries) {
  return entries
    .filter(entry => entry && entry.name && Number.isFinite(entry.score))
    .sort((a, b) => b.score - a.score || new Date(a.createdAt) - new Date(b.createdAt))
    .slice(0, 20);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", chunk => {
      body += chunk;

      if (body.length > 4096) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function handleLeaderboard(req, res) {
  if (req.method === "GET") {
    const entries = rankEntries(await readLeaderboard());
    sendJson(res, 200, { entries });
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const payload = JSON.parse(await readBody(req));
    const name = cleanName(payload.name);
    const score = Number(payload.score);

    if (!name || !Number.isInteger(score) || score <= 0 || score > 999999) {
      sendJson(res, 400, { error: "Bad score" });
      return;
    }

    const savedEntries = await (leaderboardQueue = leaderboardQueue.catch(() => {}).then(async () => {
      const entries = await readLeaderboard();
      const nextEntries = rankEntries([
        ...entries,
        {
          name,
          score,
          createdAt: new Date().toISOString()
        }
      ]);

      await writeLeaderboard(nextEntries);
      return nextEntries;
    }));

    sendJson(res, 201, { entries: savedEntries });
  } catch {
    sendJson(res, 400, { error: "Bad request" });
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/leaderboard") {
    handleLeaderboard(req, res);
    return;
  }

  const cleanPath = decodeURIComponent(url.pathname);
  const requested = cleanPath === "/" ? "/index.html" : cleanPath;
  const filePath = path.normalize(path.join(root, requested));

  if (!filePath.startsWith(root)) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, "Not found");
      return;
    }

    send(res, 200, data, types[path.extname(filePath)] || "application/octet-stream");
  });
});

if (require.main === module) {
  server.listen(port, host, () => {
    console.log(`Eigidos gyvatele veikia: http://${host}:${port}`);
  });
}

module.exports = server;

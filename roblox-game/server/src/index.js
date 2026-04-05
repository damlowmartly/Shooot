const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const initSqlJs = require("sql.js");

const app = express();
app.use(cors());
app.use(express.json());

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../game.db");
const TIMEOUT_MS = 8000;
const CLEANUP_INTERVAL = 3000;
const PERSIST_INTERVAL = 10000;

let db;

async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const filebuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(filebuffer);
    console.log("[DB] Loaded existing database from disk");
  } else {
    db = new SQL.Database();
    console.log("[DB] Created new in-memory database");
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      x REAL DEFAULT 0,
      y REAL DEFAULT 1,
      z REAL DEFAULT 0,
      rotY REAL DEFAULT 0,
      health INTEGER DEFAULT 100,
      last_seen INTEGER DEFAULT 0,
      color TEXT DEFAULT '#ff6b6b'
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT,
      player_name TEXT,
      content TEXT,
      timestamp INTEGER
    );
    CREATE TABLE IF NOT EXISTS game_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      data TEXT,
      timestamp INTEGER
    );
    CREATE TABLE IF NOT EXISTS cooking_state (
      id TEXT PRIMARY KEY,
      item TEXT,
      started_at INTEGER,
      done_at INTEGER,
      cooked INTEGER DEFAULT 0
    );
  `);
  saveToDisk();
}

function saveToDisk() {
  if (!db) return;
  try {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (e) {
    console.error("[DB] Save error:", e.message);
  }
}

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function run(sql, params = []) { db.run(sql, params); }
function get(sql, params = []) { return query(sql, params)[0] || null; }

setInterval(() => saveToDisk(), PERSIST_INTERVAL);

setInterval(() => {
  if (!db) return;
  const now = Date.now();
  run("DELETE FROM players WHERE last_seen < ?", [now - TIMEOUT_MS]);
  const row = get("SELECT COUNT(*) as c FROM players");
  if (row && row.c == 0) {
    run("DELETE FROM messages");
    run("DELETE FROM game_events");
    run("DELETE FROM cooking_state");
    try { run("DELETE FROM sqlite_sequence WHERE name IN ('messages','game_events')"); } catch(e) {}
    saveToDisk();
    console.log("[AUTO-CLEAR] All players offline. DB wiped.");
  }
}, CLEANUP_INTERVAL);

app.post("/join", (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  const id = uuidv4();
  const spawnX = (Math.random() - 0.5) * 8;
  const spawnZ = (Math.random() - 0.5) * 8;
  const now = Date.now();
  run("INSERT INTO players (id, name, x, y, z, rotY, health, last_seen, color) VALUES (?, ?, ?, 1, ?, 0, 100, ?, ?)",
    [id, name.slice(0, 20), spawnX, spawnZ, now, color || "#ff6b6b"]);
  run("INSERT INTO messages (player_id, player_name, content, timestamp) VALUES (?, ?, ?, ?)",
    [id, "SYSTEM", `${name} joined the game!`, now]);
  res.json({ id, x: spawnX, y: 1, z: spawnZ });
});

app.post("/update", (req, res) => {
  const { id, x, y, z, rotY } = req.body;
  run("UPDATE players SET x=?, y=?, z=?, rotY=?, last_seen=? WHERE id=?", [x, y, z, rotY ?? 0, Date.now(), id]);
  const p = get("SELECT id FROM players WHERE id=?", [id]);
  if (!p) return res.status(404).json({ error: "Player not found" });
  res.json({ ok: true });
});

app.get("/state", (req, res) => {
  const now = Date.now();
  const players = query("SELECT * FROM players WHERE last_seen > ?", [now - TIMEOUT_MS]);
  const messages = query("SELECT * FROM messages ORDER BY timestamp DESC LIMIT 50").reverse();
  const events = query("SELECT * FROM game_events WHERE timestamp > ? ORDER BY timestamp ASC", [now - 5000]);
  const cooking = query("SELECT * FROM cooking_state");
  res.json({ players, messages, events, cooking });
});

app.post("/chat", (req, res) => {
  const { id, content } = req.body;
  if (!content || !id) return res.status(400).json({ error: "Missing fields" });
  const player = get("SELECT * FROM players WHERE id=?", [id]);
  if (!player) return res.status(404).json({ error: "Player not found" });
  run("INSERT INTO messages (player_id, player_name, content, timestamp) VALUES (?, ?, ?, ?)",
    [id, player.name, content.slice(0, 200), Date.now()]);
  res.json({ ok: true });
});

app.post("/shoot", (req, res) => {
  const { shooter_id, target_id } = req.body;
  const shooter = get("SELECT * FROM players WHERE id=?", [shooter_id]);
  const target = get("SELECT * FROM players WHERE id=?", [target_id]);
  if (!shooter || !target) return res.status(404).json({ error: "Player not found" });
  const newHealth = Math.max(0, target.health - 34);
  run("UPDATE players SET health=? WHERE id=?", [newHealth, target_id]);
  let died = false;
  if (newHealth <= 0) {
    died = true;
    const now = Date.now();
    run("INSERT INTO game_events (type, data, timestamp) VALUES (?, ?, ?)",
      ["kill", JSON.stringify({ killer: shooter.name, victim: target.name }), now]);
    run("INSERT INTO messages (player_id, player_name, content, timestamp) VALUES (?, ?, ?, ?)",
      ["SYSTEM", "SYSTEM", `💀 ${shooter.name} eliminated ${target.name}!`, now]);
    run("DELETE FROM players WHERE id=?", [target_id]);
  }
  res.json({ ok: true, died, newHealth });
});

app.post("/leave", (req, res) => {
  const { id } = req.body;
  const player = get("SELECT * FROM players WHERE id=?", [id]);
  if (player) {
    run("INSERT INTO messages (player_id, player_name, content, timestamp) VALUES (?, ?, ?, ?)",
      ["SYSTEM", "SYSTEM", `${player.name} left the game.`, Date.now()]);
    run("DELETE FROM players WHERE id=?", [id]);
  }
  res.json({ ok: true });
});

app.post("/cook/start", (req, res) => {
  const { id: cookId, item } = req.body;
  const now = Date.now();
  run("INSERT OR REPLACE INTO cooking_state (id, item, started_at, done_at, cooked) VALUES (?, ?, ?, ?, 0)",
    [cookId, item, now, now + 8000]);
  res.json({ ok: true, done_at: now + 8000 });
});

app.get("/cook/check/:cookId", (req, res) => {
  const state = get("SELECT * FROM cooking_state WHERE id=?", [req.params.cookId]);
  if (!state) return res.json({ found: false });
  const done = Date.now() >= state.done_at;
  if (done && !state.cooked) run("UPDATE cooking_state SET cooked=1 WHERE id=?", [state.id]);
  res.json({ found: true, done, item: state.item, cooked: state.cooked });
});

const PORT = process.env.PORT || 3001;
initDB().then(() => {
  app.listen(PORT, () => console.log(`Game server on :${PORT}`));
}).catch(err => { console.error("DB init failed:", err); process.exit(1); });

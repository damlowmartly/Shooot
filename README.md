# 🧱 BlockWorld — Multiplayer Roblox-Style Shooter

A browser-based 3D blocky multiplayer shooter with chat, cooking, and guns — built with Three.js, Express, and SQLite.

---

## 🗂 Project Structure

```
roblox-game/
├── client/        ← Three.js frontend (deploy to Vercel)
│   ├── index.html
│   ├── vite.config.js
│   ├── vercel.json
│   └── src/
│       ├── main.js       ← game loop, input, shooting, polling
│       ├── world.js      ← room, furniture, lights
│       ├── character.js  ← blocky player, gun, bullets, nametags
│       └── api.js        ← fetch wrappers for backend
└── server/        ← Express + SQLite backend (deploy to Render)
    ├── src/index.js
    ├── render.yaml
    └── package.json
```

---

## 🎮 Controls

| Key | Action |
|-----|--------|
| W A S D | Move |
| Mouse | Look around |
| Left Click | Shoot |
| E | Interact (cook egg near stove) |
| T | Open chat |
| Enter | Send chat |
| ESC | Unlock mouse / close chat |

---

## 🚀 Deploy

### Step 1 — Deploy Backend to Render

1. Push the `server/` folder to a GitHub repo (or the whole monorepo)
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo, set **Root Directory** to `server`
4. Set **Build Command**: `npm install`
5. Set **Start Command**: `node src/index.js`
6. Add a **Disk** (free tier): mount at `/data`, 1GB
7. Add environment variable: `DB_PATH=/data/game.db`
8. Deploy — copy your Render URL, e.g. `https://blockworld-server.onrender.com`

### Step 2 — Deploy Frontend to Vercel

1. Edit `client/vercel.json` — replace `YOUR-RENDER-APP` with your Render URL
2. Go to [vercel.com](https://vercel.com) → New Project
3. Connect repo, set **Root Directory** to `client`
4. Add environment variable: `VITE_API_URL=https://YOUR-RENDER-APP.onrender.com`
5. Deploy!

### Local Dev

```bash
# Terminal 1 — Server
cd server
npm install
npm run dev    # runs on :3001

# Terminal 2 — Client
cd client
npm install
npm run dev    # runs on :5173, proxies /api → :3001
```

---

## ✨ Features

- 🧱 **Blocky 3D characters** — Roblox/Minecraft style with head, torso, arms, legs
- 🔫 **First-person shooter** — click to shoot, raycaster hit detection
- 💀 **Kill system** — 3 hits = dead, removed from game, can respawn
- 🍳 **Cooking** — walk to stove, press E, cook an egg in 8 seconds
- 💬 **Chat panel** — side chat with all players, system kill messages
- 🏠 **Furnished room** — living room, dining room, kitchen, bedroom
- 🗄️ **DB auto-clear** — when all players go offline, DB wipes clean automatically
- 🌐 **No WebSockets** — pure HTTP polling every 300ms, fast enough for this scale

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| 3D Engine | Three.js |
| Frontend Build | Vite |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Hosting FE | Vercel |
| Hosting BE | Render |

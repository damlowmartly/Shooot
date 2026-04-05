# 🧱 BlockWorld — Local Setup Guide

Everything runs on your computer. No cloud needed.

---

## ✅ Requirements

- **Node.js 18+** — https://nodejs.org (download LTS)
- **npm** — comes with Node.js
- A terminal (Command Prompt, PowerShell, or any shell)

Check you have it:
```bash
node -v   # should print v18 or higher
npm -v    # should print 9 or higher
```

---

## 🚀 Quick Start (3 steps)

### Step 1 — Start the server

Open a terminal in the `server/` folder:

```bash
cd server
npm install
npm start
```

You should see:
```
🎮 BlockWorld server running at http://localhost:3001
[DB] SQLite ready at .../game.db
```

> **Note:** `npm install` compiles `better-sqlite3` natively.
> This needs Python and a C++ compiler (see Troubleshooting below if it fails).

---

### Step 2 — Start the client

Open a **second terminal** in the `client/` folder:

```bash
cd client
npm install
npm run dev
```

You should see:
```
  VITE v5.x ready

  ➜  Local:   http://localhost:5173/
```

---

### Step 3 — Play!

Open **http://localhost:5173** in your browser.

To play multiplayer locally, open the same URL in **multiple browser tabs** — each tab is a separate player!

---

## 🎮 Controls

| Key / Input | Action |
|---|---|
| `W A S D` | Move |
| Mouse | Look around |
| `Left Click` | Shoot 🔫 |
| `E` | Interact (cook near stove) |
| `T` | Open chat |
| `Enter` | Send chat message |
| `ESC` | Unlock mouse / close chat |

---

## 🗄️ Database Info

- SQLite file lives at `server/game.db`
- Auto-created on first run
- **Auto-wiped** when all players go offline (no manual cleanup needed)
- To manually reset: just delete `server/game.db` and restart the server

---

## 🛠️ Troubleshooting

### `npm install` fails in `server/` with build errors

`better-sqlite3` needs a C++ compiler. Fix by OS:

**Windows:**
```bash
npm install --global windows-build-tools
# Then retry: npm install
```
Or install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (select "Desktop development with C++")

**macOS:**
```bash
xcode-select --install
# Then retry: npm install
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install build-essential python3
# Then retry: npm install
```

---

### Port already in use

If port 3001 is taken:
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3001 | xargs kill
```

---

### Game is laggy

The game polls the server every 300ms. For smoother local play you can lower it:
In `client/src/main.js`, find `setInterval` inside `startPolling()` and change `300` to `100`.

---

## 📁 File Structure

```
roblox-game/
├── SETUP_LOCAL.md      ← You are here
├── README.md           ← Vercel + Render cloud deploy
├── client/             ← Frontend (Three.js + Vite)
│   ├── index.html      ← Lobby screen + game UI
│   ├── vite.config.js  ← Dev server + /api proxy
│   └── src/
│       ├── main.js         ← Game loop, input, shooting, chat
│       ├── world.js        ← Room + all furniture
│       ├── character.js    ← Blocky player, gun, bullets
│       └── api.js          ← All fetch() calls to server
└── server/             ← Backend (Express + SQLite)
    ├── src/index.js    ← All game logic + DB
    └── package.json
```

---

## 🔁 Restarting

Just `Ctrl+C` both terminals and run `npm start` / `npm run dev` again.
The DB auto-wipes when empty, so state is always clean on restart.

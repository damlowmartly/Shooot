// Points to your Render backend in production, or local proxy in dev
const BASE = import.meta.env.VITE_API_URL || "/api";

export async function joinGame(name, color) {
  const r = await fetch(`${BASE}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, color }),
  });
  return r.json();
}

export async function updatePlayer(id, x, y, z, rotY) {
  await fetch(`${BASE}/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, x, y, z, rotY }),
  }).catch(() => {});
}

export async function getState() {
  const r = await fetch(`${BASE}/state`);
  return r.json();
}

export async function sendChat(id, content) {
  await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, content }),
  });
}

export async function shoot(shooter_id, target_id) {
  const r = await fetch(`${BASE}/shoot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shooter_id, target_id }),
  });
  return r.json();
}

export async function leaveGame(id) {
  await fetch(`${BASE}/leave`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  }).catch(() => {});
}

export async function startCooking(cookId, item) {
  const r = await fetch(`${BASE}/cook/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: cookId, item }),
  });
  return r.json();
}

export async function checkCooking(cookId) {
  const r = await fetch(`${BASE}/cook/check/${cookId}`);
  return r.json();
}

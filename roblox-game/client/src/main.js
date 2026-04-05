import * as THREE from "three";
import { buildWorld, INTERACTABLES } from "./world.js";
import { createCharacter, animateCharacter, createBullet, createNametag } from "./character.js";
import {
  joinGame, updatePlayer, getState, sendChat,
  shoot, leaveGame, startCooking, checkCooking,
} from "./api.js";

// ---- PLAYER COLORS ----
export const PLAYER_COLORS = [
  "#e74c3c","#e67e22","#f1c40f","#2ecc71",
  "#3498db","#9b59b6","#1abc9c","#e91e63",
];

// ---- DOM ----
const lobbyEl = document.getElementById("lobby");
const gameEl = document.getElementById("game");
const canvas = document.getElementById("canvas");
const crosshair = document.getElementById("crosshair");
const hud = document.getElementById("hud");
const chatPanel = document.getElementById("chat-panel");
const messagesEl = document.getElementById("messages");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const onlineCount = document.getElementById("online-count");
const healthFill = document.getElementById("health-fill-inner");
const healthText = document.getElementById("health-text");
const hudName = document.getElementById("hud-name");
const notifsEl = document.getElementById("notifs");
const cookUi = document.getElementById("cook-ui");
const cookItemName = document.getElementById("cook-item-name");
const cookProgress = document.getElementById("cook-progress-inner");
const cookStatus = document.getElementById("cook-status");
const cookClose = document.getElementById("cook-close");
const controlsHint = document.getElementById("controls-hint");
const deathScreen = document.getElementById("death-screen");
const respawnBtn = document.getElementById("respawn-btn");
const nameInput = document.getElementById("name-input");
const joinBtn = document.getElementById("join-btn");
const colorRow = document.getElementById("color-row");

// ---- STATE ----
let myId = null;
let myName = "";
let myColor = PLAYER_COLORS[0];
let myHealth = 100;
let isDead = false;
let pointerLocked = false;
let chatOpen = false;
let cookingId = null;
let cookDoneAt = 0;

const keys = {};
const otherPlayers = {}; // id -> { group, health }
const bullets = [];
let lastMessageId = -1;

// ---- COLOR PICKER ----
PLAYER_COLORS.forEach((c, i) => {
  const btn = document.createElement("div");
  btn.className = "color-btn" + (i === 0 ? " selected" : "");
  btn.style.background = c;
  btn.onclick = () => {
    document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    myColor = c;
  };
  colorRow.appendChild(btn);
});

// ---- THREE SETUP ----
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x87ceeb);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x87ceeb, 20, 50);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 100);
camera.position.set(0, 1.65, 0);

// Camera yaw/pitch
const yawObj = new THREE.Object3D();
const pitchObj = new THREE.Object3D();
yawObj.add(pitchObj);
pitchObj.add(camera);
scene.add(yawObj);

buildWorld(scene);

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ---- POINTER LOCK ----
canvas.addEventListener("click", () => {
  if (myId && !chatOpen && !isDead) canvas.requestPointerLock();
});
document.addEventListener("pointerlockchange", () => {
  pointerLocked = document.pointerLockElement === canvas;
});
document.addEventListener("mousemove", (e) => {
  if (!pointerLocked || chatOpen) return;
  yawObj.rotation.y -= e.movementX * 0.002;
  pitchObj.rotation.x = Math.max(
    -Math.PI / 2.5,
    Math.min(Math.PI / 2.5, pitchObj.rotation.x - e.movementY * 0.002)
  );
});

// ---- KEYBOARD ----
document.addEventListener("keydown", (e) => {
  if (e.code === "KeyT" && !chatOpen && myId) {
    e.preventDefault();
    openChat();
    return;
  }
  if (e.code === "Escape") {
    if (chatOpen) closeChat();
    else document.exitPointerLock();
    return;
  }
  if (e.code === "KeyE" && !chatOpen && myId) {
    checkInteract();
    return;
  }
  if (chatOpen && e.code === "Enter") {
    submitChat();
    return;
  }
  if (!chatOpen) keys[e.code] = true;
});
document.addEventListener("keyup", (e) => { keys[e.code] = false; });

function openChat() {
  chatOpen = true;
  document.exitPointerLock();
  chatInput.focus();
}
function closeChat() {
  chatOpen = false;
  chatInput.blur();
}

chatSend.addEventListener("click", submitChat);
async function submitChat() {
  const msg = chatInput.value.trim();
  if (!msg || !myId) return;
  chatInput.value = "";
  await sendChat(myId, msg);
}

// ---- JOIN ----
joinBtn.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); return; }
  joinBtn.disabled = true;
  joinBtn.textContent = "Joining...";

  const data = await joinGame(name, myColor);
  if (data.error) { joinBtn.disabled = false; joinBtn.textContent = "JOIN GAME"; return; }

  myId = data.id;
  myName = name;
  myHealth = 100;
  isDead = false;

  yawObj.position.set(data.x, 1.65, data.z);

  lobbyEl.style.display = "none";
  gameEl.style.display = "block";
  crosshair.style.display = "block";
  hud.style.display = "flex";
  chatPanel.style.display = "flex";
  controlsHint.style.display = "block";
  hudName.textContent = name;

  updateHealthUI(100);
  canvas.requestPointerLock();
  startPolling();
  gameLoop();

  // Leave on tab close
  window.addEventListener("beforeunload", () => leaveGame(myId));
});

// ---- MOVEMENT ----
const moveDir = new THREE.Vector3();
const SPEED = 5;
const clock = new THREE.Clock();
let wasMoving = false;

function movePlayer(delta) {
  if (isDead) return;
  moveDir.set(0, 0, 0);
  if (keys["KeyW"] || keys["ArrowUp"])    moveDir.z -= 1;
  if (keys["KeyS"] || keys["ArrowDown"])  moveDir.z += 1;
  if (keys["KeyA"] || keys["ArrowLeft"])  moveDir.x -= 1;
  if (keys["KeyD"] || keys["ArrowRight"]) moveDir.x += 1;

  if (moveDir.length() > 0) {
    moveDir.normalize();
    moveDir.applyEuler(new THREE.Euler(0, yawObj.rotation.y, 0));
    const nx = yawObj.position.x + moveDir.x * SPEED * delta;
    const nz = yawObj.position.z + moveDir.z * SPEED * delta;
    // Clamp inside room
    yawObj.position.x = Math.max(-14.5, Math.min(14.5, nx));
    yawObj.position.z = Math.max(-14.5, Math.min(14.5, nz));
    wasMoving = true;
  } else {
    wasMoving = false;
  }
}

// ---- SHOOTING ----
let lastShot = 0;
const raycaster = new THREE.Raycaster();
const CENTER = new THREE.Vector2(0, 0);

canvas.addEventListener("mousedown", async (e) => {
  if (e.button !== 0 || !pointerLocked || chatOpen || isDead || !myId) return;
  const now = Date.now();
  if (now - lastShot < 350) return;
  lastShot = now;

  // Spawn bullet
  raycaster.setFromCamera(CENTER, camera);
  const dir = raycaster.ray.direction.clone();
  const bPos = camera.getWorldPosition(new THREE.Vector3()).add(dir.clone().multiplyScalar(0.5));
  const b = createBullet(bPos, dir);
  scene.add(b);
  bullets.push(b);

  // Check hit against other players
  const meshes = Object.values(otherPlayers).flatMap(p => {
    const arr = [];
    p.group.traverse(c => { if (c.isMesh) arr.push(c); });
    return arr;
  });

  const hits = raycaster.intersectObjects(meshes);
  if (hits.length > 0) {
    // Find which player was hit
    const hitMesh = hits[0].object;
    for (const [pid, pdata] of Object.entries(otherPlayers)) {
      let found = false;
      pdata.group.traverse(c => { if (c === hitMesh) found = true; });
      if (found) {
        const result = await shoot(myId, pid);
        if (result.died) {
          showNotif(`💥 You eliminated a player!`);
        }
        break;
      }
    }
  }

  // Muzzle flash
  showMuzzleFlash();
});

function showMuzzleFlash() {
  const flash = document.createElement("div");
  flash.style.cssText = `
    position:fixed;inset:0;background:rgba(255,255,150,0.15);
    pointer-events:none;z-index:60;border-radius:50%;
    animation:none;
  `;
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 80);
}

// ---- BULLETS UPDATE ----
function updateBullets(delta) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.position.addScaledVector(b.userData.velocity, delta);
    b.userData.life -= delta;
    // Orient bullet to travel direction
    b.lookAt(b.position.clone().add(b.userData.velocity));
    if (b.userData.life <= 0) {
      scene.remove(b);
      bullets.splice(i, 1);
    }
  }
}

// ---- INTERACTION ----
function checkInteract() {
  if (isDead) return;
  const playerPos = yawObj.position;

  for (const item of INTERACTABLES) {
    const d = playerPos.distanceTo(item.mesh.position);
    if (d < 3) {
      if (item.type === "stove") {
        startCookingEgg();
      }
      break;
    }
  }
}

async function startCookingEgg() {
  if (cookingId) return;
  cookingId = myId + "_egg_" + Date.now();
  const result = await startCooking(cookingId, "Egg");
  cookDoneAt = result.done_at;
  cookUi.style.display = "flex";
  cookItemName.textContent = "Egg 🥚";
  cookStatus.textContent = "Cooking...";
  cookProgress.style.width = "0%";
  showNotif("🍳 Started cooking egg!");
}

cookClose.onclick = () => {
  cookUi.style.display = "none";
  cookingId = null;
};

function updateCookingUI() {
  if (!cookingId || !cookDoneAt) return;
  const now = Date.now();
  const total = 8000;
  const elapsed = now - (cookDoneAt - total);
  const pct = Math.min(100, (elapsed / total) * 100);
  cookProgress.style.width = pct + "%";
  if (now >= cookDoneAt) {
    cookStatus.textContent = "✅ Egg is ready! Enjoy your meal!";
    cookProgress.style.background = "#2ecc71";
    if (!cookUi.dataset.notified) {
      cookUi.dataset.notified = "1";
      showNotif("🍳 Egg is cooked! 🥚→🍳");
    }
  }
}

// ---- POLLING ----
let knownMessages = new Set();

function startPolling() {
  setInterval(async () => {
    if (!myId) return;
    try {
      // Heartbeat
      await updatePlayer(
        myId,
        yawObj.position.x,
        yawObj.position.y - 1.65,
        yawObj.position.z,
        yawObj.rotation.y
      );

      const state = await getState();

      // Update other players
      const seen = new Set();
      for (const p of state.players) {
        if (p.id === myId) {
          // Check if we were killed
          if (!p && myHealth > 0) triggerDeath();
          continue;
        }
        seen.add(p.id);
        if (!otherPlayers[p.id]) {
          // New player
          const hexColor = parseInt(p.color.replace("#", ""), 16);
          const group = createCharacter(hexColor);
          const tag = createNametag(p.name, p.color);
          group.add(tag);
          scene.add(group);
          otherPlayers[p.id] = { group, name: p.name, health: p.health };
          showNotif(`${p.name} joined!`);
        }
        // Update position
        const pd = otherPlayers[p.id];
        pd.group.position.set(p.x, p.y + 0.6, p.z);
        pd.group.rotation.y = p.rotY;
        pd.health = p.health;
      }
      // Remove disconnected
      for (const id of Object.keys(otherPlayers)) {
        if (!seen.has(id)) {
          scene.remove(otherPlayers[id].group);
          delete otherPlayers[id];
        }
      }

      // Online count
      onlineCount.textContent = state.players.length;

      // Messages
      let newMessages = false;
      for (const msg of state.messages) {
        if (!knownMessages.has(msg.id)) {
          knownMessages.add(msg.id);
          appendMessage(msg);
          newMessages = true;
        }
      }
      if (newMessages) messagesEl.scrollTop = messagesEl.scrollHeight;

      // Check if we were killed (not in player list)
      const stillAlive = state.players.find(p => p.id === myId);
      if (!stillAlive && !isDead && myId) {
        triggerDeath();
      }

    } catch (e) { /* ignore */ }
  }, 300);
}

function appendMessage(msg) {
  const div = document.createElement("div");
  div.className = "msg";
  const isSystem = msg.player_name === "SYSTEM";
  div.innerHTML = `<span class="sender ${isSystem ? 'system' : ''}">${
    isSystem ? "📢" : msg.player_name
  }</span> <span class="text">${escapeHtml(msg.content)}</span>`;
  messagesEl.appendChild(div);
  // Keep max 60 messages in DOM
  while (messagesEl.children.length > 60) {
    messagesEl.removeChild(messagesEl.firstChild);
  }
}

function escapeHtml(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ---- DEATH ----
function triggerDeath() {
  isDead = true;
  myHealth = 0;
  updateHealthUI(0);
  document.exitPointerLock();
  deathScreen.style.display = "flex";
  showNotif("💀 You were eliminated!");
}

respawnBtn.addEventListener("click", async () => {
  deathScreen.style.display = "none";
  // Re-join
  const data = await joinGame(myName, myColor);
  if (data.error) return;
  myId = data.id;
  myHealth = 100;
  isDead = false;
  cookingId = null;
  cookUi.style.display = "none";
  delete cookUi.dataset.notified;
  yawObj.position.set(data.x, 1.65, data.z);
  updateHealthUI(100);
  canvas.requestPointerLock();
  showNotif(`Welcome back, ${myName}!`);
});

function updateHealthUI(hp) {
  myHealth = hp;
  const pct = Math.max(0, hp);
  healthFill.style.width = pct + "%";
  healthFill.style.background = pct > 60 ? "#2ecc71" : pct > 30 ? "#f39c12" : "#e74c3c";
  healthText.textContent = pct;
}

// ---- NOTIFS ----
function showNotif(text) {
  const el = document.createElement("div");
  el.className = "notif";
  el.textContent = text;
  notifsEl.appendChild(el);
  setTimeout(() => el.remove(), 3100);
}

// ---- NEARBY INTERACT HINT ----
const interactHintEl = document.createElement("div");
interactHintEl.style.cssText = `
  position:fixed;bottom:50px;left:50%;transform:translateX(-50%);
  background:rgba(0,0,0,0.7);color:#f39c12;padding:6px 18px;
  border-radius:20px;font-size:0.8rem;display:none;pointer-events:none;z-index:40;
`;
document.body.appendChild(interactHintEl);

function updateInteractHint() {
  if (!myId || isDead) { interactHintEl.style.display = "none"; return; }
  const pos = yawObj.position;
  for (const item of INTERACTABLES) {
    if (pos.distanceTo(item.mesh.position) < 3) {
      interactHintEl.textContent = item.label;
      interactHintEl.style.display = "block";
      return;
    }
  }
  interactHintEl.style.display = "none";
}

// ---- GAME LOOP ----
function gameLoop() {
  requestAnimationFrame(gameLoop);
  const delta = Math.min(clock.getDelta(), 0.1);

  if (!isDead && myId) {
    movePlayer(delta);
    // Animate others
    for (const pd of Object.values(otherPlayers)) {
      animateCharacter(pd.group, true, delta);
    }
  }

  updateBullets(delta);
  updateCookingUI();
  updateInteractHint();

  renderer.render(scene, camera);
}

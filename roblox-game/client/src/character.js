import * as THREE from "three";

// Build a blocky humanoid character (Roblox-style boxes)
export function createCharacter(color = 0xff6b6b) {
  const group = new THREE.Group();

  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const box = (w, h, d, color, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    return m;
  };

  // Body
  const torso = box(0.5, 0.6, 0.3, color, 0, 0.3, 0);
  group.add(torso);

  // Head
  const head = box(0.42, 0.42, 0.42, 0xffe0bd, 0, 0.83, 0);
  group.add(head);

  // Eyes
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const eye = (x) => {
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.05), eyeMat);
    e.position.set(x, 0.87, 0.22);
    return e;
  };
  group.add(eye(-0.1));
  group.add(eye(0.1));

  // Arms
  const leftArm = box(0.18, 0.55, 0.18, color, -0.34, 0.25, 0);
  const rightArm = box(0.18, 0.55, 0.18, color, 0.34, 0.25, 0);
  group.add(leftArm);
  group.add(rightArm);

  // Legs
  const leftLeg = box(0.2, 0.55, 0.2, 0x2c5f8a, -0.13, -0.35, 0);
  const rightLeg = box(0.2, 0.55, 0.2, 0x2c5f8a, 0.13, -0.35, 0);
  group.add(leftLeg);
  group.add(rightLeg);

  // ---- GUN (attached to right arm) ----
  // Gun body
  const gunBody = box(0.3, 0.1, 0.08, 0x333333, 0.52, 0.1, 0.15);
  group.add(gunBody);
  // Gun barrel
  const gunBarrel = box(0.2, 0.06, 0.06, 0x222222, 0.68, 0.12, 0.15);
  group.add(gunBarrel);
  // Gun handle
  const gunHandle = box(0.08, 0.16, 0.08, 0x555555, 0.5, 0.02, 0.15);
  group.add(gunHandle);

  // Nametag (will be set per player)
  group.userData.head = head;
  group.userData.leftLeg = leftLeg;
  group.userData.rightLeg = rightLeg;
  group.userData.leftArm = leftArm;
  group.userData.rightArm = rightArm;
  group.userData.animPhase = Math.random() * Math.PI * 2;

  return group;
}

// Animate walking
export function animateCharacter(char, isMoving, delta) {
  if (!char.userData.leftLeg) return;
  char.userData.animPhase = (char.userData.animPhase || 0) + (isMoving ? delta * 6 : delta * 1);
  const swing = isMoving ? Math.sin(char.userData.animPhase) * 0.4 : 0;
  char.userData.leftLeg.rotation.x = swing;
  char.userData.rightLeg.rotation.x = -swing;
  char.userData.leftArm.rotation.x = -swing * 0.5;
  char.userData.rightArm.rotation.x = swing * 0.5;
}

// Create a bullet (blocky rectangle)
export function createBullet(position, direction) {
  const geo = new THREE.BoxGeometry(0.08, 0.08, 0.35);
  const mat = new THREE.MeshLambertMaterial({ color: 0xffee00 });
  const bullet = new THREE.Mesh(geo, mat);
  bullet.position.copy(position);
  bullet.userData.velocity = direction.clone().multiplyScalar(30);
  bullet.userData.life = 1.5;
  return bullet;
}

// Create nametag sprite above player
export function createNametag(name, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  // Background pill
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.beginPath();
  ctx.roundRect(4, 8, 248, 48, 12);
  ctx.fill();

  // Color dot
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(28, 32, 10, 0, Math.PI * 2);
  ctx.fill();

  // Name
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px Arial";
  ctx.textAlign = "left";
  ctx.fillText(name.slice(0, 12), 46, 38);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(1.6, 0.4, 1);
  sprite.position.set(0, 1.4, 0);
  return sprite;
}

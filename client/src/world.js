import * as THREE from "three";

export const INTERACTABLES = []; // { mesh, type, label, cookItem }

function box(w, h, d, color, x, y, z, rx = 0, ry = 0, rz = 0) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function buildWorld(scene) {
  // ---- ROOM ----
  // Floor
  const floor = box(30, 0.2, 30, 0x8B6914, 0, -0.1, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  // Ceiling
  scene.add(box(30, 0.2, 30, 0xd4cfc8, 0, 5.1, 0));

  // Walls
  scene.add(box(30, 5, 0.3, 0xeee5d5, 0, 2.5, -15));  // back
  scene.add(box(30, 5, 0.3, 0xeee5d5, 0, 2.5,  15));  // front
  scene.add(box(0.3, 5, 30, 0xe0d8c8, -15, 2.5, 0));  // left
  scene.add(box(0.3, 5, 30, 0xe0d8c8,  15, 2.5, 0));  // right

  // ---- LIVING ROOM ----
  // Sofa (L-shape)
  const sofaBase = box(4, 0.5, 1.5, 0x3a6ea5, -7, 0.25, -4);
  scene.add(sofaBase);
  scene.add(box(4, 0.8, 0.4, 0x3a6ea5, -7, 0.65, -4.7)); // back
  scene.add(box(0.4, 0.8, 1.5, 0x3a6ea5, -9, 0.65, -4));  // arm L
  scene.add(box(0.4, 0.8, 1.5, 0x3a6ea5, -5, 0.65, -4));  // arm R

  // Coffee table
  scene.add(box(2, 0.08, 1, 0x5a3e28, -7, 0.7, -2.5));
  scene.add(box(0.1, 0.7, 0.1, 0x5a3e28, -6.1, 0.35, -2.1));
  scene.add(box(0.1, 0.7, 0.1, 0x5a3e28, -7.9, 0.35, -2.1));
  scene.add(box(0.1, 0.7, 0.1, 0x5a3e28, -6.1, 0.35, -2.9));
  scene.add(box(0.1, 0.7, 0.1, 0x5a3e28, -7.9, 0.35, -2.9));

  // TV Stand
  scene.add(box(3.5, 0.6, 0.8, 0x2c2c2c, -7, 0.3, -14.6));
  // TV
  const tv = box(3, 1.8, 0.1, 0x111111, -7, 1.5, -14.6);
  scene.add(tv);
  scene.add(box(2.8, 1.6, 0.05, 0x1a1aff, -7, 1.5, -14.55)); // screen blue

  // ---- DINING ROOM ----
  // Dining table
  scene.add(box(3, 0.1, 1.8, 0x7b4f2e, 4, 0.75, -6));
  // Table legs
  for (const [lx, lz] of [[2.6,-5.1],[5.4,-5.1],[2.6,-6.9],[5.4,-6.9]]) {
    scene.add(box(0.12, 0.75, 0.12, 0x5a3a1a, lx, 0.375, lz));
  }
  // Chairs (4)
  const chairPositions = [
    [2.8, -4.4, 0], [5.2, -4.4, 0],
    [2.8, -7.6, Math.PI], [5.2, -7.6, Math.PI],
  ];
  for (const [cx, cz, cy] of chairPositions) {
    scene.add(box(0.7, 0.08, 0.7, 0xb8860b, cx, 0.45, cz));
    scene.add(box(0.7, 0.6, 0.1, 0xb8860b, cx, 0.75, cz + (cy === 0 ? -0.3 : 0.3)));
    for (const [lx, lz2] of [[-0.25, -0.25],[0.25,-0.25],[-0.25,0.25],[0.25,0.25]]) {
      scene.add(box(0.07, 0.45, 0.07, 0x8B6914, cx + lx, 0.225, cz + lz2));
    }
  }

  // ---- KITCHEN ----
  // Counter base
  scene.add(box(6, 0.9, 0.8, 0xdbd9d6, 8, 0.45, -13.6));
  // Counter top
  scene.add(box(6, 0.08, 0.9, 0x888, 8, 0.92, -13.55));

  // Cabinets above
  scene.add(box(6, 1.2, 0.5, 0xdbd9d6, 8, 3, -14.75));

  // Fridge
  const fridge = box(0.8, 1.9, 0.75, 0xe8e8e8, 11.1, 0.95, -13.7);
  scene.add(fridge);
  scene.add(box(0.05, 0.4, 0.05, 0xaaa, 10.75, 1.5, -13.35)); // handle

  // Stove / Oven — INTERACTABLE
  const stove = box(1.2, 0.05, 0.8, 0x333, 8, 0.95, -13.55);
  stove.userData = { interactable: true, type: "stove", label: "Press E to cook egg 🥚" };
  scene.add(stove);
  INTERACTABLES.push({ mesh: stove, type: "stove", label: "Press E to cook egg 🥚", cookItem: "Egg" });

  // Burner rings
  for (const [bx, bz] of [[7.4, -13.55],[8.6,-13.55]]) {
    scene.add(box(0.35, 0.06, 0.35, 0x555, bx, 0.98, bz));
    scene.add(box(0.2, 0.07, 0.2, 0x222, bx, 0.99, bz));
  }

  // Sink
  scene.add(box(1, 0.05, 0.7, 0xaaa, 5.5, 0.93, -13.58));
  scene.add(box(0.8, 0.15, 0.5, 0x999, 5.5, 0.85, -13.58));
  // Faucet
  scene.add(box(0.05, 0.4, 0.05, 0x888, 5.5, 1.1, -13.9));
  scene.add(box(0.3, 0.05, 0.05, 0x888, 5.5, 1.3, -13.8));

  // ---- BEDROOM ----
  // Bed frame
  scene.add(box(2.2, 0.3, 3.5, 0x6b4c11, -10, 0.15, 7));
  // Mattress
  scene.add(box(2, 0.35, 3.2, 0xfdfde8, -10, 0.47, 7));
  // Pillow
  scene.add(box(0.8, 0.2, 0.6, 0xfff, -10, 0.67, 5.4));
  // Headboard
  scene.add(box(2.2, 0.9, 0.15, 0x6b4c11, -10, 0.65, 5.2));

  // Nightstand
  scene.add(box(0.7, 0.6, 0.6, 0x8B6914, -11.5, 0.3, 5.5));
  // Lamp on nightstand
  scene.add(box(0.1, 0.5, 0.1, 0x666, -11.5, 0.85, 5.5));
  const lampShade = box(0.4, 0.3, 0.4, 0xffeeaa, -11.5, 1.25, 5.5);
  scene.add(lampShade);

  // Wardrobe
  scene.add(box(1.8, 2.5, 0.7, 0x7b5e42, -13, 1.25, -0.5));
  scene.add(box(0.05, 2.5, 0.7, 0x5a3e28, -12.1, 1.25, -0.5));
  // Knobs
  scene.add(box(0.08, 0.08, 0.08, 0xd4af37, -12.55, 1.5, -0.16));
  scene.add(box(0.08, 0.08, 0.08, 0xd4af37, -13.45, 1.5, -0.16));

  // Desk
  scene.add(box(1.8, 0.07, 0.8, 0xa0785a, -10, 0.75, 10.5));
  for (const dx of [-0.85, 0.85]) {
    scene.add(box(0.08, 0.75, 0.08, 0x7b5e42, -10 + dx, 0.375, 10.5));
  }
  // Monitor on desk
  scene.add(box(0.9, 0.6, 0.05, 0x111, -10, 1.2, 10.1));
  scene.add(box(0.8, 0.5, 0.04, 0x4a90e2, -10, 1.22, 10.08));

  // Desk chair
  scene.add(box(0.6, 0.06, 0.6, 0x222, -10, 0.55, 11.2));
  scene.add(box(0.6, 0.5, 0.1, 0x222, -10, 0.8, 10.95));

  // ---- LIGHTS ----
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
  sun.position.set(5, 10, 5);
  sun.castShadow = true;
  scene.add(sun);

  // Room point lights
  const lights = [
    [-7, 4.8, -8, 0xfff5e0, 0.8],
    [4, 4.8, -6, 0xfff5e0, 0.8],
    [8, 4.8, -10, 0xfff5e0, 0.9],
    [-10, 4.8, 7, 0xfff5e0, 0.7],
  ];
  for (const [lx, ly, lz, col, int] of lights) {
    const pl = new THREE.PointLight(col, int, 15);
    pl.position.set(lx, ly, lz);
    scene.add(pl);
    // Ceiling light fixture
    scene.add(box(0.4, 0.1, 0.4, 0xffffcc, lx, 4.95, lz));
  }

  return INTERACTABLES;
}

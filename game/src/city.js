// city.js — Solara Bay world geometry: grid city, ocean, pier, landmarks.
// Coordinates in metres, x/z in [-180, 180]. Roads on the 40 m grid.
import { createRng, pick } from './util.js';

export const GRID = [-160, -120, -80, -40, 0, 40, 80, 120, 160];
export const ROAD_HALF = 5;
export const BOUND = 180;

const BUILDING_COLORS = [0xe8b48a, 0xd98f6a, 0xf2d5a0, 0x9fc3d8, 0xc9a0c4, 0x8fb8a0, 0xe0e0d8, 0xd8b8d0];
const ROOF_COLORS = [0x8a5a3a, 0x5a6a7a, 0x7a4a4a, 0x4a5a6a];

function windowTexture(rng, base) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 64, 128);
  for (let y = 8; y < 120; y += 16) {
    for (let x = 6; x < 58; x += 14) {
      g.fillStyle = rng() < 0.75 ? '#2a3542' : '#f7d774';
      g.fillRect(x, y, 9, 11);
    }
  }
  const t = new THREE.CanvasTexture(c);
  return t;
}

export function buildCity(scene, rng) {
  const city = { buildings: [], palms: [] }; // buildings: {minX,maxX,minZ,maxZ}
  const mat = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, ...opts });

  // Sky, fog, lights.
  scene.background = new THREE.Color(0x87bfe8);
  scene.fog = new THREE.Fog(0x9fc8e8, 220, 520);
  const hemi = new THREE.HemisphereLight(0xfff2d8, 0x4a6a8a, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe8b0, 1.6);
  sun.position.set(120, 180, 60);
  scene.add(sun);

  // Ground (city base) — stops short of the sea so the water shows.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(360, 360),
    mat(0x9a8f7a)
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 0);
  scene.add(ground);

  // Ocean: east (x > 168) and south (z > 168) of the city, slightly below ground.
  const seaMat = mat(0x1a7ab8);
  const seaE = new THREE.Mesh(new THREE.PlaneGeometry(90, 400), seaMat);
  seaE.rotation.x = -Math.PI / 2; seaE.position.set(210, -0.15, 0);
  scene.add(seaE);
  const seaS = new THREE.Mesh(new THREE.PlaneGeometry(360, 90), seaMat);
  seaS.rotation.x = -Math.PI / 2; seaS.position.set(0, -0.15, 210);
  scene.add(seaS);
  // Sand strip along the shore.
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(360, 10), mat(0xe8d8a8));
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.02, 163);
  scene.add(sand);
  const sandE = new THREE.Mesh(new THREE.PlaneGeometry(10, 360), mat(0xe8d8a8));
  sandE.rotation.x = -Math.PI / 2; sandE.position.set(163, 0.02, 0);
  scene.add(sandE);

  // Roads: dark strips on every grid line, plus sidewalks.
  const roadMat = mat(0x3a3a40);
  const walkMat = mat(0xb8b0a0);
  for (const v of GRID) {
    const rH = new THREE.Mesh(new THREE.PlaneGeometry(360, ROAD_HALF * 2), roadMat);
    rH.rotation.x = -Math.PI / 2; rH.position.set(0, 0.03, v);
    scene.add(rH);
    const rV = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, 360), roadMat);
    rV.rotation.x = -Math.PI / 2; rV.position.set(v, 0.03, 0);
    scene.add(rV);
    const wH = new THREE.Mesh(new THREE.PlaneGeometry(360, 3), walkMat);
    wH.rotation.x = -Math.PI / 2; wH.position.set(0, 0.04, v + ROAD_HALF + 1.5);
    scene.add(wH);
    const wV = new THREE.Mesh(new THREE.PlaneGeometry(3, 360), walkMat);
    wV.rotation.x = -Math.PI / 2; wV.position.set(v + ROAD_HALF + 1.5, 0.04, 0);
    scene.add(wV);
  }
  // Centre dashes.
  const dashMat = mat(0xf7d774);
  for (const v of GRID) {
    for (let u = -170; u <= 170; u += 16) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.5), dashMat);
      d.rotation.x = -Math.PI / 2; d.position.set(u, 0.05, v);
      scene.add(d);
      const d2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4), dashMat);
      d2.rotation.x = -Math.PI / 2; d2.position.set(v, 0.05, u);
      scene.add(d2);
    }
  }

  // Buildings: one or two per block, seeded, kept off the roads.
  const texA = windowTexture(rng, '#e8b48a');
  const texB = windowTexture(rng, '#9fc3d8');
  const texC = windowTexture(rng, '#d98f6a');
  const texs = [texA, texB, texC];
  for (let ix = 0; ix < GRID.length - 1; ix++) {
    for (let iz = 0; iz < GRID.length - 1; iz++) {
      const x0 = GRID[ix] + ROAD_HALF + 3, x1 = GRID[ix + 1] - ROAD_HALF - 3;
      const z0 = GRID[iz] + ROAD_HALF + 3, z1 = GRID[iz + 1] - ROAD_HALF - 3;
      // Keep the marina, bank plaza, garage yard and safehouse clear.
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      if (Math.hypot(cx - 100, cz - 36) < 26) continue;
      if (Math.hypot(cx + 40, cz + 80) < 22) continue;
      if (Math.hypot(cx + 118, cz - 116) < 22) continue;
      if (Math.hypot(cx - 138, cz - 76) < 18) continue;
      if (rng() < 0.15) continue;
      const n = rng() < 0.6 ? 1 : 2;
      for (let k = 0; k < n; k++) {
        const w = 10 + rng() * 12, d = 10 + rng() * 12, h = 8 + rng() * 30;
        const bx = x0 + 4 + rng() * Math.max(1, (x1 - x0) - 8 - w);
        const bz = z0 + 4 + rng() * Math.max(1, (z1 - z0) - 8 - d);
        const col = pick(rng, BUILDING_COLORS);
        const tex = pick(rng, texs);
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          new THREE.MeshLambertMaterial({ color: col, map: tex })
        );
        m.position.set(bx + w / 2, h / 2, bz + d / 2);
        scene.add(m);
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.6, 0.8, d + 0.6),
          mat(pick(rng, ROOF_COLORS))
        );
        roof.position.set(bx + w / 2, h + 0.4, bz + d / 2);
        scene.add(roof);
        city.buildings.push({ minX: bx, maxX: bx + w, minZ: bz, maxZ: bz + d });
      }
    }
  }

  // Landmarks (low boxes, no collision needed beyond the generic list).
  function landmark(x, z, w, h, d, color, label) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, h / 2, z);
    scene.add(m);
    city.buildings.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    return m;
  }
  landmark(-118, 116, 18, 7, 12, 0xc85a3a, 'garage'); // Rico's Garage
  landmark(-40, -80, 16, 10, 12, 0x4a6a8a, 'bank'); // the bank
  landmark(138, 76, 12, 6, 10, 0x8fb8a0, 'safehouse'); // safehouse

  // The pier: wooden deck reaching east over the water at z=-40.
  const pierMat = mat(0x8a6a4a);
  const pier = new THREE.Mesh(new THREE.BoxGeometry(22, 0.6, 8), pierMat);
  pier.position.set(168, 0.3, -40);
  scene.add(pier);
  for (let px = 160; px <= 176; px += 4) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.2, 6), pierMat);
    post.position.set(px, -0.3, -43.5);
    scene.add(post);
  }

  // Marina beacon: tall glowing pillar at the boss coupe's corner.
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 34, 12),
    new THREE.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: 0.22 })
  );
  beacon.position.set(126, 17, 48);
  scene.add(beacon);
  const beaconBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.8, 1.2, 12),
    mat(0x3a3a40)
  );
  beaconBase.position.set(126, 0.6, 48);
  scene.add(beaconBase);

  // Palm trees along the sidewalks.
  const trunkMat = mat(0x7a5a3a);
  const leafMat = mat(0x2a8a4a);
  for (let i = 0; i < 40; i++) {
    const road = pick(rng, GRID);
    const along = -170 + rng() * 340;
    const side = rng() < 0.5 ? -1 : 1;
    const px = rng() < 0.5 ? road + side * (ROAD_HALF + 3) : along;
    const pz = rng() < 0.5 ? along : road + side * (ROAD_HALF + 3);
    if (Math.abs(px) > 158 || Math.abs(pz) > 158) continue;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 5, 6), trunkMat);
    trunk.position.set(px, 2.5, pz);
    scene.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.4, 7), leafMat);
    leaves.position.set(px, 6, pz);
    scene.add(leaves);
    city.palms.push({ x: px, z: pz });
  }

  return city;
}

// Circle (car/pedestrian) vs building AABBs: push out, return the push vector or null.
export function collideBuildings(city, x, z, r) {
  for (const b of city.buildings) {
    const cx = Math.max(b.minX, Math.min(x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
    const dx = x - cx, dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        return { x: (dx / d) * (r - d), z: (dz / d) * (r - d) };
      }
      return { x: 0, z: r };
    }
  }
  return null;
}

export function insideBuilding(city, x, z) {
  for (const b of city.buildings) {
    if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) return true;
  }
  return false;
}

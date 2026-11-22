// main.js — Solara Bay: boot, game loop, state machine, camera, wiring.
import { createRng } from './util.js';
import { buildCity } from './city.js';
import { Car, resolveCarCollisions } from './vehicles.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Peds } from './pedestrians.js';
import { Police } from './police.js';
import { Missions } from './missions.js';
import { AudioSys } from './audio.js';
import { Effects } from './effects.js';
import { HUD } from './hud.js';
import { Minimap } from './minimap.js';
import { Input } from './input.js';
import { installDebug } from './debug.js';
import { shoot } from './combat.js';
import { saveGame } from './save.js';
import { dist2d } from './util.js';

const rng = createRng(20261123);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game').appendChild(renderer.domElement);

const city = buildCity(scene, rng);
const player = new Player(scene);
const traffic = new Traffic(scene, rng, city);
const peds = new Peds(scene, rng);
const police = new Police(scene, rng, city);
const audio = new AudioSys();
const effects = new Effects(scene, camera);
const hud = new HUD();
const minimap = new Minimap();
const input = new Input();

const POLICE_SPAWNS = [
  { x: -80, z: 0, heading: 0 },
  { x: 80, z: 40, heading: Math.PI },
  { x: 0, z: -80, heading: Math.PI / 2 },
];

const missionCars = {
  coupe: new Car(scene, rng, { kind: 'mission', x: 24, z: 26, heading: Math.PI / 2, color: 0xc03028, enterable: true, topSpeed: 36, accel: 20 }),
  getaway: new Car(scene, rng, { kind: 'getaway', x: -46, z: 8, heading: 0, color: 0x2a2a2a, enterable: true, topSpeed: 34, accel: 19 }),
  boss: new Car(scene, rng, { kind: 'boss', x: 128, z: 50, heading: -Math.PI / 2, color: 0x111114, enterable: true, topSpeed: 38, accel: 21 }),
};

const world = {
  scene, camera, renderer, rng, city, player, traffic, peds, police,
  audio, effects, hud, minimap, input, missionCars,
  state: 'menu', mission: 0, stage: 0, cash: 0, wanted: 0,
  elapsed: 0, freeRoam: false, missionTarget: null, enemies: [],
  missions: null,
};
Object.defineProperty(world, 'allCars', {
  get() {
    return [missionCars.coupe, missionCars.getaway, missionCars.boss, ...traffic.allCars, ...police.cars];
  },
});
world.missions = new Missions(world);

// ---- overlays -------------------------------------------------------------
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySub = document.getElementById('overlay-sub');
const pauseOverlay = document.getElementById('pause-overlay');
const btnNew = document.getElementById('btn-new');
const btnFree = document.getElementById('btn-freeroam');

function showOverlay(title, sub) {
  overlayTitle.textContent = title;
  overlaySub.textContent = sub;
  overlay.style.display = 'flex';
}
function hideOverlay() { overlay.style.display = 'none'; }
function showMenu() {
  showOverlay('SOLARA BAY', 'Six jobs. One city. $12,000 on the line. Steal cars, lose the heat, take the money.');
}
function showWin() {
  showOverlay('YOU WIN — $12,000', 'Marlo took the boss coupe home. Solara Bay is yours — free roam or play again.');
}
function showBusted() {
  showOverlay('BUSTED', 'The law caught up with Marlo. Start a new game and try again.');
}

// ---- game start / reset ----------------------------------------------------
function startGame(freeRoam) {
  world.state = 'playing';
  world.freeRoam = !!freeRoam;
  world.mission = freeRoam ? 6 : 0;
  world.stage = 0;
  world.cash = 0;
  world.wanted = 0;
  world.missionTarget = null;
  player.health = 100;
  player.hasPistol = false;
  player.weapon = null;
  player.pistolCooldown = 0;
  if (player.inCar) {
    player.inCar = false;
    player.car = null;
    player.mesh.visible = true;
  }
  player.teleport(0, 0, 0);
  missionCars.coupe.respawnAtSpot({ x: 24, z: 26, heading: Math.PI / 2 });
  missionCars.getaway.respawnAtSpot({ x: -46, z: 8, heading: 0 });
  missionCars.boss.respawnAtSpot({ x: 128, z: 50, heading: -Math.PI / 2 });
  world.missions.clearEnemies();
  world.missions.m4Spawned = false;
  world.missions.holdTime = 0;
  world.missions.legs = [false, false, false, false];
  police.evadeTime = 0;
  police.cars.forEach((c, i) => {
    c.respawnAtSpot(POLICE_SPAWNS[i]);
    c.patrolTarget = null;
  });
  bustedTimer = 0;
  input.clear();
  hideOverlay();
  pauseOverlay.style.display = 'none';
  audio.start();
  updateCamera(0, true);
}

world.startGame = startGame;
world.tryEnterCar = () => {
  const car = player.nearestCar(world.allCars, 6);
  if (car) player.enterCar(car);
};
world.cameraSnap = () => updateCamera(0, true);

btnNew.addEventListener('click', () => { audio.ensure(); startGame(false); });
btnFree.addEventListener('click', () => {
  audio.ensure();
  if (world.state === 'won') {
    world.state = 'playing';
    world.freeRoam = true;
    hideOverlay();
  } else {
    startGame(true);
  }
});

// ---- input -----------------------------------------------------------------
input.onKeyDown = (k) => {
  if (world.state !== 'playing') return;
  if (k === 'e') {
    if (player.inCar) player.exitCar();
    else {
      const car = player.nearestCar(world.allCars, 4.5);
      if (car) player.enterCar(car);
    }
  } else if (k === 'r') {
    audio.cycle();
  } else if (k === 'z') {
    minimap.cycleIn();
  } else if (k === 'x') {
    minimap.cycleOut();
  }
};
input.onEscape = () => {
  if (world.state === 'playing') {
    world.state = 'paused';
    pauseOverlay.style.display = 'flex';
  } else if (world.state === 'paused') {
    world.state = 'playing';
    pauseOverlay.style.display = 'none';
  }
};
renderer.domElement.addEventListener('mousedown', (e) => {
  if (world.state === 'playing' && e.button === 0) shoot(world);
});
window.addEventListener('contextmenu', (e) => e.preventDefault());

// ---- camera ----------------------------------------------------------------
function updateCamera(dt, snap) {
  const p = player;
  const fx = Math.sin(p.heading), fz = Math.cos(p.heading);
  const px = p.inCar && p.car ? p.car.x : p.x;
  const pz = p.inCar && p.car ? p.car.z : p.z;
  const dist = p.inCar ? 13 : 10;
  const height = p.inCar ? 5.5 : 4.5;
  const tx = px - fx * dist, tz = pz - fz * dist, ty = height;
  if (snap) {
    camera.position.set(tx, ty, tz);
  } else {
    const k = 1 - Math.pow(0.002, dt);
    camera.position.x += (tx - camera.position.x) * k;
    camera.position.y += (ty - camera.position.y) * k;
    camera.position.z += (tz - camera.position.z) * k;
  }
  camera.lookAt(px + fx * 6, 1.5, pz + fz * 6);
}

// ---- per-frame helpers -------------------------------------------------------
let bustedTimer = 0;

function updateBusted(dt) {
  if (player.inCar || world.wanted <= 0) { bustedTimer = 0; return; }
  let near = false;
  for (const c of police.cars) {
    if (!c.wrecked && dist2d(c.x, c.z, player.x, player.z) < 4) { near = true; break; }
  }
  if (near) {
    bustedTimer += dt;
    if (bustedTimer >= 2) {
      world.state = 'busted';
      showBusted();
    }
  } else {
    bustedTimer = 0;
  }
  if (player.health <= 0) {
    world.state = 'busted';
    showBusted();
  }
}

function updateCarSmoke(dt) {
  for (const c of world.allCars) {
    if (c.wrecked || c.health >= 50) continue;
    c.smokeTimer -= dt;
    if (c.smokeTimer <= 0) {
      c.smokeTimer = 0.3;
      effects.spawnSphere(c.x, 1.2, c.z, 0x666666, 0.7, 1.1, { x: 0, y: 1.2, z: 0 });
      if (c.health < 25) {
        effects.spawnSphere(c.x, 1.0, c.z, 0xff7020, 0.5, 0.5, { x: 0, y: 2, z: 0 });
      }
    }
  }
}

function updateMissionTarget() {
  const m = world.mission;
  if (m === 0) world.missionTarget = world.stage === 0 ? { x: 24, z: 26 } : { x: -118, z: 116 };
  else if (m === 1) world.missionTarget = null;
  else if (m === 2) world.missionTarget = world.stage === 0 ? { x: 158, z: -40 } : { x: 78, z: 116 };
  else if (m === 3) world.missionTarget = { x: 100, z: 36 };
  else if (m === 4) world.missionTarget = world.stage === 0 ? { x: -40, z: -80 } : { x: 138, z: 76 };
  else if (m === 5) world.missionTarget = world.stage === 0 ? { x: 126, z: 48 } : { x: -118, z: 116 };
  else world.missionTarget = null;
}

// ---- main loop ---------------------------------------------------------------
let last = performance.now();
let prevState = world.state;

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  world.elapsed += dt;

  if (world.state === 'playing') {
    // Mouse drag turns Marlo on foot.
    if (!player.inCar && input.mouseDX !== 0) {
      player.heading += input.mouseDX * 0.004;
      input.mouseDX = 0;
    }
    if (player.inCar && player.car) {
      const throttle = (input.has('w') ? 1 : 0) + (input.has('s') ? -1 : 0);
      const steer = (input.has('d') ? 1 : 0) - (input.has('a') ? 1 : 0);
      player.car.drive(dt, throttle, steer);
      player.x = player.car.x;
      player.z = player.car.z;
      player.heading = player.car.heading;
    } else {
      player.walk(dt, input, city);
    }
    if (player.pistolCooldown > 0) player.pistolCooldown -= dt;

    // Mission cars tick their wreck timers (boss re-deals, parked stay wrecked).
    for (const c of [missionCars.coupe, missionCars.getaway, missionCars.boss, ...traffic.parked]) {
      const r = c.update(dt);
      if (r === 'redeal') c.respawnAtSpot({ x: 128, z: 50, heading: -Math.PI / 2 });
    }
    // If the player's car wrecks, Marlo is thrown out.
    if (player.inCar && player.car && player.car.wrecked) {
      player.exitCar();
      player.health = Math.max(0, player.health - 20);
    }
    if (player.inCar && player.car) {
      resolveCarCollisions(player.car, city, world.allCars, true, world);
    }
    traffic.update(dt, world);
    police.update(dt, world);
    peds.update(dt);
    world.missions.update(dt);
    world.missions.updateEnemies(dt);
    updateBusted(dt);
    updateCarSmoke(dt);
    updateMissionTarget();
  }

  if (world.state === 'won' && prevState !== 'won') showWin();
  if (world.state === 'busted' && prevState !== 'busted') showBusted();
  prevState = world.state;

  effects.update(dt);
  updateCamera(dt, false);
  hud.update(dt, world);
  minimap.draw(world);
  renderer.render(scene, camera);
}

installDebug(world);
showMenu();
updateCamera(0, true);
requestAnimationFrame(loop);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

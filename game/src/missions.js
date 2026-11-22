// missions.js — the six-mission story of Solara Bay (M1–M6), exact rewards and triggers.
import { dist2d } from './util.js';
import { saveGame } from './save.js';

export const MISSION_INFO = [
  { name: 'M1 — The First Coupe', objective: 'Steal the coupe at (24, 26) and take it to Rico\'s Garage.' },
  { name: 'M2 — Lose the Heat', objective: 'Wanted 2! Drive the outer ring and lose the cops.' },
  { name: 'M3 — The Package', objective: 'On foot to the pier, then deliver to Coral Junction.' },
  { name: 'M4 — Marina Showdown', objective: 'Take down the 3 Vipers at Marina East.' },
  { name: 'M5 — The Bank Job', objective: 'Hold E at the bank vault, then escape to the safehouse.' },
  { name: 'M6 — The Last Job', objective: 'Steal the boss coupe and bring it to Rico\'s Garage.' },
  { name: 'Story complete', objective: 'Free roam — Solara Bay is yours.' },
];

const GARAGE = { x: -118, z: 116 };
const COUPE_SPOT = { x: 24, z: 26 };
const PIER = { x: 158, z: -40 };
const CORAL = { x: 78, z: 116 };
const VAULT = { x: -40, z: -80 };
const GETAWAY_SPOT = { x: -46, z: 8 };
const SAFEHOUSE = { x: 138, z: 76 };
const BOSS_SPOT = { x: 126, z: 48 };

function makeViper(scene, x, z, kind) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1.1, 10), new THREE.MeshLambertMaterial({ color: 0x8a1a1a }));
  body.position.y = 1.0; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshLambertMaterial({ color: 0xc89878 }));
  head.position.y = 1.8; g.add(head);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.9), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
  gun.position.set(0.2, 1.2, 0.5); g.add(gun);
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 })
  );
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02;
  g.add(blob);
  g.position.set(x, 0, z);
  scene.add(g);
  return { mesh: g, x, z, health: 45, kind, shootCooldown: 1 + Math.random(), strafePhase: Math.random() * 6 };
}

export class Missions {
  constructor(world) {
    this.world = world;
    this.holdTime = 0;
    this.legs = [false, false, false, false]; // S, W, N, E edges of the outer ring
    this.m4Spawned = false;
  }

  clearEnemies() {
    for (const e of this.world.enemies) this.world.scene.remove(e.mesh);
    this.world.enemies = [];
  }

  spawnAmbush() {
    const w = this.world;
    w.enemies.push(makeViper(w.scene, 152, -34, 'm3'));
    w.enemies.push(makeViper(w.scene, 164, -46, 'm3'));
  }

  spawnMarinaShowdown() {
    const w = this.world;
    w.enemies.push(makeViper(w.scene, 106, 42, 'm4'));
    w.enemies.push(makeViper(w.scene, 94, 30, 'm4'));
    w.enemies.push(makeViper(w.scene, 110, 28, 'm4'));
    this.m4Spawned = true;
  }

  spawnGuards() {
    const w = this.world;
    w.enemies.push(makeViper(w.scene, 120, 42, 'm6'));
    w.enemies.push(makeViper(w.scene, 132, 44, 'm6'));
  }

  toast(text) {
    if (this.world.hud) this.world.hud.toast(text);
    if (this.world.audio) this.world.audio.mission();
  }

  update(dt) {
    const w = this.world;
    const p = w.player;
    if (w.state !== 'playing' || w.freeRoam) return;
    const m = w.mission;

    if (m === 0) {
      // M1: entering the coupe sets stage 1; delivering it completes the mission.
      if (w.stage === 0 && p.inCar && p.car === w.missionCars.coupe) {
        w.stage = 1;
        this.toast('M1: Take the coupe to Rico\'s Garage.');
      }
      if (w.stage === 1 && p.inCar && p.car === w.missionCars.coupe && dist2d(p.car.x, p.car.z, GARAGE.x, GARAGE.z) < 12) {
        w.mission = 1; w.stage = 0; w.cash = 500; w.wanted = 2;
        this.legs = [false, false, false, false];
        this.toast('M1 complete — $500. M2: Lose the Heat!');
      }
    } else if (m === 1) {
      // M2: drive the outer ring (|coord| = 160) on all four sides, then the heat must drop.
      const x = p.inCar && p.car ? p.car.x : p.x;
      const z = p.inCar && p.car ? p.car.z : p.z;
      if (z > 150) this.legs[0] = true;
      if (x < -150) this.legs[1] = true;
      if (z < -150) this.legs[2] = true;
      if (x > 150) this.legs[3] = true;
      if (this.legs.every(Boolean) && w.wanted === 0) {
        w.mission = 2; w.stage = 0; w.cash = 1300;
        this.toast('M2 complete — $1,300. M3: The Package.');
      }
    } else if (m === 2) {
      // M3: reach the pier (ambush), then deliver to Coral Junction.
      if (w.stage === 0 && dist2d(p.x, p.z, PIER.x, PIER.z) < 12) {
        w.stage = 1;
        this.spawnAmbush();
        this.toast('Ambush! Two Vipers at the pier — run the package!');
      }
      if (w.stage === 1 && dist2d(p.x, p.z, CORAL.x, CORAL.z) < 10) {
        this.clearEnemies();
        w.mission = 3; w.stage = 0; w.cash = 2500;
        p.hasPistol = true; p.weapon = 'pistol';
        this.spawnMarinaShowdown();
        this.toast('M3 complete — $2,500. M4: Marina Showdown. Pistol issued.');
      }
    } else if (m === 3) {
      // M4: clear all three Marina Vipers.
      if (this.m4Spawned && w.enemies.length === 0) {
        w.mission = 4; w.stage = 0; w.cash = 4000;
        this.toast('M4 complete — $4,000. M5: The Bank Job.');
      }
    } else if (m === 4) {
      // M5: hold E at the vault (< 6 m, strictly — exactly 6.0 never triggers), then escape.
      if (w.stage === 0) {
        const near = dist2d(p.x, p.z, VAULT.x, VAULT.z) < 6;
        if (!p.inCar && near && w.input.has('e')) {
          this.holdTime += dt;
          if (this.holdTime >= 4) {
            w.stage = 1; w.wanted = 3;
            this.holdTime = 0;
            this.toast('Vault cracked! Wanted 3 — steal the getaway car!');
          }
        } else {
          this.holdTime = 0;
        }
      }
      if (w.stage === 1 && p.inCar && p.car === w.missionCars.getaway && dist2d(p.car.x, p.car.z, SAFEHOUSE.x, SAFEHOUSE.z) < 12) {
        w.mission = 5; w.stage = 0; w.cash = 7000;
        this.spawnGuards();
        this.toast('M5 complete — $7,000. M6: The Last Job.');
      }
    } else if (m === 5) {
      // M6: steal the boss coupe, deliver it to the garage.
      if (w.stage === 0 && p.inCar && p.car === w.missionCars.boss) {
        w.stage = 1;
        this.toast('M6: Take the boss coupe to Rico\'s Garage!');
      }
      if (w.stage === 1 && p.inCar && p.car === w.missionCars.boss && dist2d(p.car.x, p.car.z, GARAGE.x, GARAGE.z) < 12) {
        w.mission = 6; w.cash = 12000;
        w.state = 'won';
        saveGame(w);
        this.toast('YOU WIN — $12,000!');
      }
    }
  }

  // Enemy behaviour: M4 Vipers hold ~15 m, strafe and shoot; M3/M6 stand their ground.
  updateEnemies(dt) {
    const w = this.world;
    const p = w.player;
    for (const e of w.enemies) {
      if (e.health <= 0) continue;
      if (e.kind === 'm4') {
        const dx = p.x - e.x, dz = p.z - e.z;
        const d = Math.hypot(dx, dz) || 1;
        const nx = dx / d, nz = dz / d;
        let mx = 0, mz = 0;
        if (d < 12) { mx -= nx; mz -= nz; }
        else if (d > 20) { mx += nx; mz += nz; }
        // Strafe sideways, slowly.
        const st = Math.sin(w.elapsed * 0.7 + e.strafePhase);
        mx += -nz * st * 0.8; mz += nx * st * 0.8;
        e.x += mx * 2.5 * dt;
        e.z += mz * 2.5 * dt;
        e.mesh.position.set(e.x, 0, e.z);
        e.mesh.rotation.y = Math.atan2(dx, dz);
        // Shoot at Marlo.
        e.shootCooldown -= dt;
        if (e.shootCooldown <= 0 && d < 60 && w.state === 'playing') {
          e.shootCooldown = 1.5;
          if (Math.random() < 0.5) {
            p.health -= 6;
            if (w.effects) w.effects.hitSpark(p.x, 1.4, p.z);
            if (p.health <= 0) { p.health = 0; w.state = 'busted'; }
          }
          if (w.effects) w.effects.muzzle(e.x, 1.3, e.z, Math.atan2(dx, dz));
        }
      } else {
        // M3 ambush Vipers and M6 guards hold their ground, watching.
        e.mesh.rotation.y = Math.atan2(p.x - e.x, p.z - e.z);
      }
    }
  }
}

// debug.js — window.__solara: the exact debug API the play-test drives.
import { shoot } from './combat.js';
import { headingTo } from './util.js';

export function installDebug(world) {
  const p = world.player;
  const api = {
    state() {
      return {
        state: world.state,
        mission: world.mission,
        cash: world.cash,
        wanted: world.wanted,
        health: Math.round(p.health),
        inCar: p.inCar,
        stage: world.stage,
        carHealth: p.inCar && p.car ? Math.round(p.car.health) : null,
        speedKmh: Math.round(p.speedKmh * 10) / 10,
        x: Math.round(p.x * 100) / 100,
        z: Math.round(p.z * 100) / 100,
        radio: world.audio.radio,
        mapZoom: world.minimap.zoom,
        enemies: world.enemies.length,
        parkedCars: world.traffic.parkedCount,
        hasPistol: p.hasPistol,
        weapon: p.weapon,
        elapsed: Math.round(world.elapsed * 100) / 100,
      };
    },
    teleport(x, z, heading) {
      p.teleport(x, z, heading);
      // Teleporting parks the car: no carried momentum.
      if (p.inCar && p.car) p.car.speed = 0;
    },
    damageCar(n) {
      if (p.inCar && p.car) p.car.damage(n, world);
    },
    repairCar() {
      if (p.inCar && p.car) { p.car.health = 100; p.car.wrecked = false; p.car.wreckTimer = 0; p.car.mesh.visible = true; }
    },
    givePistol() {
      p.hasPistol = true;
      p.weapon = 'pistol';
    },
    faceNearestParkedCar() {
      let best = null, bestD = Infinity;
      for (const c of world.traffic.parked) {
        if (c.wrecked) continue;
        const d = Math.hypot(c.x - p.x, c.z - p.z);
        if (d < bestD) { bestD = d; best = c; }
      }
      if (best) {
        p.heading = headingTo(p.x, p.z, best.x, best.z);
        if (p.inCar && p.car) p.car.heading = p.heading;
      }
    },
    faceNearestEnemy() {
      let best = null, bestD = Infinity;
      for (const e of world.enemies) {
        if (e.health <= 0) continue;
        const d = Math.hypot(e.x - p.x, e.z - p.z);
        if (d < bestD) { bestD = d; best = e; }
      }
      if (best) p.heading = headingTo(p.x, p.z, best.x, best.z);
    },
    click() {
      shoot(world);
    },
    heal() {
      p.heal();
    },
    // Staging helper the maker uses to frame the four screenshots. It only
    // positions things through the game's own state; the game is never faked.
    stageScreenshot(scene) {
      const start = () => world.startGame();
      // A toast from the previous scene must not linger into this shot.
      if (world.hud) {
        world.hud.toastTimer = 0;
        if (world.hud.el.toast) world.hud.el.toast.style.opacity = '0';
      }
      if (scene === 'chase') {
        start();
        p.teleport(24, 26, 0);
        world.tryEnterCar();
        p.teleport(150, 40, Math.PI / 2);
        p.car.speed = 20;
        world.wanted = 2;
        const cops = world.police.cars;
        cops[0].x = 142; cops[0].z = 44; cops[0].heading = Math.PI / 2; cops[0].speed = 20;
        cops[1].x = 158; cops[1].z = 30; cops[1].heading = Math.PI / 2; cops[1].speed = 20;
      } else if (scene === 'driving') {
        start();
        p.teleport(24, 26, 0);
        world.tryEnterCar();
        p.teleport(0, 60, Math.PI);
        p.car.speed = 26;
        world.missionTarget = { x: -118, z: 116 };
      } else if (scene === 'onfoot') {
        start();
        p.teleport(100, 60, Math.PI / 2);
        world.missionTarget = { x: 100, z: 36 };
      } else if (scene === 'combat') {
        start();
        world.mission = 5; world.stage = 0; world.cash = 7000;
        world.missions.spawnGuards();
        p.teleport(118, 48, Math.PI / 2);
        p.hasPistol = true; p.weapon = 'pistol';
        world.missionTarget = { x: 126, z: 48 };
      }
      world.cameraSnap();
    },
  };
  window.__solara = api;
  return api;
}

// police.js — patrol cars that chase when wanted, ram, and let the heat decay.
import { Car, resolveCarCollisions } from './vehicles.js';
import { GRID } from './city.js';
import { angleDiff, clamp, dist2d, headingTo, pick } from './util.js';

const SPAWNS = [
  { x: -80, z: 0, heading: 0 },
  { x: 80, z: 40, heading: Math.PI },
  { x: 0, z: -80, heading: Math.PI / 2 },
];

export class Police {
  constructor(scene, rng, city) {
    this.scene = scene; this.rng = rng; this.city = city;
    this.cars = SPAWNS.map((s) => {
      const c = new Car(scene, rng, { kind: 'police', x: s.x, z: s.z, heading: s.heading, topSpeed: 27, accel: 16, color: 0x1a1a22, respawnAt: s });
      c.ramCooldown = 0;
      c.patrolTarget = null;
      return c;
    });
    this.evadeTime = 0;
  }

  update(dt, world) {
    const player = world.player;
    const px = player.inCar && player.car ? player.car.x : player.x;
    const pz = player.inCar && player.car ? player.car.z : player.z;
    let nearest = Infinity;
    for (const c of this.cars) {
      const resp = c.update(dt);
      if (resp === 'respawn') {
        const s = c.respawnAt;
        c.respawnAtSpot(s);
        continue;
      }
      if (c.wrecked) continue;
      if (c.ramCooldown > 0) c.ramCooldown -= dt;
      const d = dist2d(c.x, c.z, px, pz);
      nearest = Math.min(nearest, d);
      if (world.wanted > 0 && world.state === 'playing') {
        // Chase: steer toward the player, top speed 27 (slower than the player's 36).
        const want = headingTo(c.x, c.z, px, pz);
        c.heading += clamp(angleDiff(want, c.heading), -2.6 * dt, 2.6 * dt);
        c.speed = Math.min(c.speed + 16 * dt, 27);
        c.move(dt);
        // Ram: damage the player's car and shove it a little.
        if (d < 4.2 && c.ramCooldown <= 0 && player.inCar && player.car) {
          player.car.damage(5, world);
          c.ramCooldown = 1.0;
          const nx = (player.car.x - c.x) / Math.max(d, 0.01);
          const nz = (player.car.z - c.z) / Math.max(d, 0.01);
          player.car.x += nx * 0.25;
          player.car.z += nz * 0.25;
          player.car.mesh.position.set(player.car.x, 0, player.car.z);
        }
      } else {
        // Patrol: cruise the roads slowly.
        if (!c.patrolTarget || dist2d(c.x, c.z, c.patrolTarget.x, c.patrolTarget.z) < 6) {
          c.patrolTarget = { x: pick(this.rng, GRID), z: pick(this.rng, GRID) };
        }
        const want = headingTo(c.x, c.z, c.patrolTarget.x, c.patrolTarget.z);
        c.heading += clamp(angleDiff(want, c.heading), -1.8 * dt, 1.8 * dt);
        c.speed = Math.min(c.speed + 8 * dt, 10);
        c.move(dt);
      }
      resolveCarCollisions(c, this.city, world.allCars, false, world);
    }
    // Wanted decay: when no police car is close, the heat cools off.
    if (world.wanted > 0 && world.state === 'playing') {
      if (nearest > 30) {
        this.evadeTime += dt;
        if (this.evadeTime >= 8) {
          this.evadeTime = 0;
          world.wanted = Math.max(0, world.wanted - 1);
        }
      } else {
        this.evadeTime = 0;
      }
    } else {
      this.evadeTime = 0;
    }
  }
}

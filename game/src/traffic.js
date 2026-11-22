// traffic.js — road traffic and parked cars (Solara Bay).
import { Car, resolveCarCollisions } from './vehicles.js';
import { GRID, ROAD_HALF } from './city.js';
import { clamp, dist2d, pick } from './util.js';

export const PARKED_SPOTS = [
  { x: 44, z: 124 }, { x: 86, z: -46 }, { x: -30, z: 44 },
  { x: 124, z: -120 }, { x: -124, z: -4 }, { x: 4, z: 84 },
];

export class Traffic {
  constructor(scene, rng, city) {
    this.scene = scene; this.rng = rng; this.city = city;
    this.parked = [];
    for (const s of PARKED_SPOTS) {
      const c = new Car(scene, rng, { kind: 'parked', x: s.x, z: s.z, heading: rng() * Math.PI * 2 });
      this.parked.push(c);
    }
    this.cars = [];
    for (let i = 0; i < 8; i++) this.spawnTrafficCar(true);
  }

  get allCars() { return [...this.parked, ...this.cars]; }
  get parkedCount() { return this.parked.filter((c) => !c.wrecked).length; }

  spawnTrafficCar(anywhere) {
    const rng = this.rng;
    const vertical = rng() < 0.5;
    const line = pick(rng, GRID);
    const along = -160 + rng() * 320;
    const dir = rng() < 0.5 ? 1 : -1;
    const c = new Car(this.scene, rng, {
      kind: 'traffic',
      x: vertical ? line : along,
      z: vertical ? along : line,
      heading: vertical ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2),
      topSpeed: 12, accel: 8,
    });
    c.ai = { vertical, line, dir, lane: 2.2, targetLane: 2.2, speed: 10 + rng() * 4 };
    this.cars.push(c);
    return c;
  }

  update(dt, world) {
    const player = world.player;
    for (const c of this.cars) {
      const resp = c.update(dt);
      if (resp === 'respawn') {
        c.respawnAtSpot({ x: pick(this.rng, GRID), z: -160 + this.rng() * 320, heading: 0 });
        c.ai = { vertical: true, line: c.x, dir: 1, lane: 2.2, targetLane: 2.2, speed: 12 };
        continue;
      }
      if (c.wrecked) continue;
      const ai = c.ai;
      // Yield: if the player's car is close behind on the same road, pull to the edge.
      let targetLane = 2.2;
      if (player.inCar && player.car) {
        const pc = player.car;
        const behind = ai.vertical
          ? Math.abs(pc.x - c.x) < 8 && ((ai.dir > 0 && pc.z < c.z && c.z - pc.z < 20) || (ai.dir < 0 && pc.z > c.z && pc.z - c.z < 20))
          : Math.abs(pc.z - c.z) < 8 && ((ai.dir > 0 && pc.x < c.x && c.x - pc.x < 20) || (ai.dir < 0 && pc.x > c.x && pc.x - c.x < 20));
        if (behind) targetLane = 4.2;
      }
      ai.targetLane = targetLane;
      ai.lane += clamp(ai.targetLane - ai.lane, -3 * dt, 3 * dt);
      // Drive along the road.
      const f = c.forward();
      const step = ai.speed * dt;
      let nx = c.x + f.x * step, nz = c.z + f.z * step;
      // Lane offset (right-hand side of the road).
      const perp = ai.vertical ? 1 : -1;
      if (ai.vertical) nx = ai.line + ai.lane * (ai.dir > 0 ? 1 : -1) * 0 + (ai.dir > 0 ? ai.lane : -ai.lane);
      else nz = ai.line + (ai.dir > 0 ? -ai.lane : ai.lane);
      // At an intersection, sometimes turn.
      const nearGrid = (v) => GRID.some((g) => Math.abs(v - g) < 3);
      if (ai.vertical && nearGrid(nz) && this.rng() < 0.02) {
        this.turnCar(c);
      } else if (!ai.vertical && nearGrid(nx) && this.rng() < 0.02) {
        this.turnCar(c);
      }
      // Turn around at the city edge.
      if (nx > 165 || nx < -165 || nz > 165 || nz < -165) {
        c.heading += Math.PI;
        ai.dir *= -1;
      }
      c.x = clamp(nx, -172, 172);
      c.z = clamp(nz, -172, 172);
      c.mesh.position.set(c.x, 0, c.z);
      c.mesh.rotation.y = c.heading;
      resolveCarCollisions(c, this.city, world.allCars, false, world);
    }
    // Parked cars only need their wreck timers.
    for (const c of this.parked) c.update(dt);
  }

  turnCar(c) {
    const ai = c.ai;
    const left = this.rng() < 0.5;
    if (ai.vertical) {
      const line = GRID.reduce((a, b) => (Math.abs(b - c.z) < Math.abs(a - c.z) ? b : a));
      ai.vertical = false; ai.line = line;
      ai.dir = left ? -1 : 1;
      c.heading = ai.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      c.z = line;
    } else {
      const line = GRID.reduce((a, b) => (Math.abs(b - c.x) < Math.abs(a - c.x) ? b : a));
      ai.vertical = true; ai.line = line;
      ai.dir = left ? 1 : -1;
      c.heading = ai.dir > 0 ? 0 : Math.PI;
      c.x = line;
    }
  }
}

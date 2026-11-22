// vehicles.js — car physics, damage and wrecks (Solara Bay).
import { clamp, dist2d } from './util.js';
import { collideBuildings } from './city.js';

const BODY_COLORS = [0xc03028, 0x2850c0, 0xe8c838, 0x30a050, 0xd8d8d8, 0x8030a0, 0xe07020];

export class Car {
  constructor(scene, rng, opts) {
    this.kind = opts.kind || 'traffic'; // mission | parked | traffic | police | boss | getaway
    this.color = opts.color !== undefined ? opts.color : BODY_COLORS[Math.floor(rng() * BODY_COLORS.length)];
    this.x = opts.x || 0; this.z = opts.z || 0;
    this.heading = opts.heading || 0;
    this.speed = 0;
    this.health = 100;
    this.wrecked = false;
    this.wreckTimer = 0;
    this.smokeTimer = 0;
    this.topSpeed = opts.topSpeed || 30;
    this.accel = opts.accel || 18;
    this.enterable = !!opts.enterable;
    this.respawnAt = opts.respawnAt || null; // {x,z,heading} for traffic/police
    this.hitCooldown = 0;

    const g = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: this.color });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 4.2), bodyMat);
    body.position.y = 0.55; g.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.6, 2.0),
      new THREE.MeshLambertMaterial({ color: 0x1a2a3a })
    );
    cabin.position.set(0, 1.15, -0.2); g.add(cabin);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
    this.wheels = [];
    for (const [wx, wz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10), wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.38, wz);
      g.add(w); this.wheels.push(w);
    }
    if (this.kind === 'police') {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.25, 0.5),
        new THREE.MeshBasicMaterial({ color: 0xff2020 })
      );
      bar.position.set(0, 1.55, -0.2); g.add(bar);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.3, 4.22), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      stripe.position.y = 0.55; g.add(stripe);
    }
    // Blob shadow: a dark disc under the car so it sits on the road.
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(2.6, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })
    );
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02;
    g.add(blob);
    this.mesh = g;
    this.mesh.position.set(this.x, 0, this.z);
    scene.add(this.mesh);
    this.scene = scene;
  }

  forward() { return { x: Math.sin(this.heading), z: Math.cos(this.heading) }; }

  // Player driving: throttle -1..1, steer -1..1.
  drive(dt, throttle, steer) {
    if (this.wrecked) return;
    if (throttle > 0) this.speed += this.accel * throttle * dt;
    else if (throttle < 0) {
      if (this.speed > 0.5) this.speed -= 26 * dt;
      else this.speed = Math.max(-8, this.speed - 10 * dt);
    } else {
      this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 6 * dt);
    }
    this.speed = clamp(this.speed, -8, this.topSpeed);
    const turn = steer * 1.9 * clamp(Math.abs(this.speed) / 12, 0, 1) * (this.speed < 0 ? -1 : 1);
    this.heading -= turn * dt;
    this.move(dt);
  }

  move(dt) {
    const f = this.forward();
    this.x += f.x * this.speed * dt;
    this.z += f.z * this.speed * dt;
    this.x = clamp(this.x, -178, 178);
    this.z = clamp(this.z, -178, 178);
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    for (const w of this.wheels) w.rotation.x += this.speed * dt * 2;
  }

  damage(n, world) {
    if (this.wrecked) return;
    this.health -= n;
    if (this.health <= 0) {
      this.health = 0;
      this.wreck(world);
    }
  }

  wreck(world) {
    this.wrecked = true;
    this.wreckTimer = 0;
    this.speed = 0;
    if (world && world.effects) world.effects.explosion(this.x, this.z, this.kind);
    if (world && world.audio) world.audio.explosion();
  }

  // Per-frame: smoke/fire flags and respawn timing. Returns 'respawn' when it should come back.
  update(dt) {
    if (this.hitCooldown > 0) this.hitCooldown -= dt;
    if (!this.wrecked) return null;
    this.wreckTimer += dt;
    if (this.kind === 'traffic' && this.wreckTimer > 8) return 'respawn';
    if (this.kind === 'police' && this.wreckTimer > 8) return 'respawn';
    if (this.kind === 'boss' && this.wreckTimer > 1.5) return 'redeal';
    return null;
  }

  respawnAtSpot(spot) {
    this.x = spot.x; this.z = spot.z; this.heading = spot.heading || 0;
    this.speed = 0; this.health = 100; this.wrecked = false; this.wreckTimer = 0;
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    this.mesh.visible = true;
  }
}

// Resolve a car's movement against buildings and other cars (soft bumps).
export function resolveCarCollisions(car, city, others, isPlayer, world) {
  if (car.wrecked) return;
  const push = collideBuildings(city, car.x, car.z, 2.2);
  if (push) {
    car.x += push.x; car.z += push.z;
    const impact = Math.abs(car.speed);
    if (impact > 6 && car.hitCooldown <= 0) {
      car.damage(Math.min(10, impact * 0.5), world);
      car.hitCooldown = 0.6;
    }
    car.speed *= 0.25;
    car.mesh.position.set(car.x, 0, car.z);
  }
  for (const o of others) {
    if (o === car || o.wrecked) continue;
    const d = dist2d(car.x, car.z, o.x, o.z);
    if (d < 4.2 && d > 0.01) {
      const pushD = (4.2 - d) / 2;
      const nx = (car.x - o.x) / d, nz = (car.z - o.z) / d;
      car.x += nx * pushD; car.z += nz * pushD;
      o.x -= nx * pushD; o.z -= nz * pushD;
      if (isPlayer && Math.abs(car.speed) > 8 && car.hitCooldown <= 0) {
        car.damage(3, world);
        car.hitCooldown = 0.8;
      }
      car.speed *= 0.82;
      car.mesh.position.set(car.x, 0, car.z);
      o.mesh.position.set(o.x, 0, o.z);
    }
  }
}

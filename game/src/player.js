// player.js — Marlo on foot and behind the wheel (Solara Bay).
import { clamp, dist2d } from './util.js';
import { collideBuildings } from './city.js';

export class Player {
  constructor(scene) {
    this.x = 0; this.z = 0; this.heading = 0;
    this.health = 100;
    this.hasPistol = false;
    this.weapon = null;
    this.inCar = false;
    this.car = null; // the Car Marlo is driving, or null
    this.walkSpeed = 7;
    this.pistolCooldown = 0;
    this.scene = scene;

    const g = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: 0xe8a838 });
    const skin = new THREE.MeshLambertMaterial({ color: 0xc89878 });
    const pants = new THREE.MeshLambertMaterial({ color: 0x2a3a5a });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1.0, 10), shirt);
    body.position.y = 1.0; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), skin);
    head.position.y = 1.75; g.add(head);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 10), new THREE.MeshLambertMaterial({ color: 0xc03028 }));
    cap.position.y = 1.98; g.add(cap);
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.7, 8), pants);
    legL.position.set(-0.16, 0.35, 0); g.add(legL);
    const legR = legL.clone(); legR.position.x = 0.16; g.add(legR);
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 12),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 })
    );
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02;
    g.add(blob);
    this.mesh = g;
    this.mesh.position.set(this.x, 0, this.z);
    scene.add(this.mesh);
  }

  get speedKmh() {
    if (this.inCar && this.car) return Math.abs(this.car.speed) * 3.6;
    return 0;
  }

  teleport(x, z, heading) {
    this.x = x; this.z = z;
    if (heading !== undefined) this.heading = heading;
    if (this.inCar && this.car) {
      this.car.x = x; this.car.z = z;
      if (heading !== undefined) this.car.heading = heading;
      this.car.mesh.position.set(x, 0, z);
      this.car.mesh.rotation.y = this.car.heading;
    }
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
  }

  enterCar(car) {
    this.inCar = true;
    this.car = car;
    this.heading = car.heading;
    this.mesh.visible = false;
  }

  exitCar() {
    if (!this.car) return;
    const c = this.car;
    // Step out on the car's left side.
    const side = { x: Math.cos(c.heading), z: -Math.sin(c.heading) };
    this.x = c.x + side.x * 2.6;
    this.z = c.z + side.z * 2.6;
    this.heading = c.heading;
    this.inCar = false;
    this.car = null;
    this.mesh.visible = true;
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
  }

  // On-foot movement. Returns distance moved this frame.
  walk(dt, input, city) {
    if (this.inCar) return 0;
    if (input.has('a')) this.heading += 2.6 * dt;
    if (input.has('d')) this.heading -= 2.6 * dt;
    let moved = 0;
    if (input.has('w')) {
      const nx = this.x + Math.sin(this.heading) * this.walkSpeed * dt;
      const nz = this.z + Math.cos(this.heading) * this.walkSpeed * dt;
      const push = collideBuildings(city, nx, nz, 0.6);
      if (!push) {
        moved = this.walkSpeed * dt;
        this.x = clamp(nx, -178, 178);
        this.z = clamp(nz, -178, 178);
      } else {
        // Slide along the wall: try x-only, then z-only.
        const px = collideBuildings(city, nx, this.z, 0.6);
        if (!px) { this.x = clamp(nx, -178, 178); moved = this.walkSpeed * dt * 0.7; }
        else {
          const pz = collideBuildings(city, this.x, nz, 0.6);
          if (!pz) { this.z = clamp(nz, -178, 178); moved = this.walkSpeed * dt * 0.7; }
        }
      }
      this.mesh.position.set(this.x, 0, this.z);
    }
    this.mesh.rotation.y = this.heading;
    return moved;
  }

  nearestCar(cars, maxDist) {
    let best = null, bestD = maxDist;
    for (const c of cars) {
      if (!c.enterable || c.wrecked) continue;
      const d = dist2d(this.x, this.z, c.x, c.z);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  heal() { this.health = 100; }
}

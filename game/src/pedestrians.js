// pedestrians.js — sidewalk walkers who scatter from explosions (Solara Bay).
import { GRID } from './city.js';
import { clamp, pick } from './util.js';

const SHIRTS = [0xe85a5a, 0x5a8ae8, 0x5ae88a, 0xe8c85a, 0xa05ae8, 0xe85ab8];

export class Peds {
  constructor(scene, rng) {
    this.scene = scene; this.rng = rng;
    this.list = [];
    for (let i = 0; i < 12; i++) {
      const g = new THREE.Group();
      const shirt = new THREE.MeshLambertMaterial({ color: pick(rng, SHIRTS) });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.95, 8), shirt);
      body.position.y = 0.95; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), new THREE.MeshLambertMaterial({ color: 0xc89878 }));
      head.position.y = 1.65; g.add(head);
      const blob = new THREE.Mesh(
        new THREE.CircleGeometry(0.5, 10),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 })
      );
      blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02;
      g.add(blob);
      const road = pick(rng, GRID);
      const along = -140 + rng() * 280;
      const vertical = rng() < 0.5;
      const p = {
        mesh: g,
        x: vertical ? road + 7 : along,
        z: vertical ? along : road + 7,
        heading: rng() * Math.PI * 2,
        speed: 1.2 + rng() * 0.8,
        scatter: 0,
      };
      g.position.set(p.x, 0, p.z);
      scene.add(g);
      this.list.push(p);
    }
  }

  scatter(x, z) {
    for (const p of this.list) {
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < 25) {
        p.scatter = 3;
        p.heading = Math.atan2(p.x - x, p.z - z);
      }
    }
  }

  update(dt) {
    for (const p of this.list) {
      const speed = p.scatter > 0 ? 4.5 : p.speed;
      if (p.scatter > 0) p.scatter -= dt;
      p.x += Math.sin(p.heading) * speed * dt;
      p.z += Math.cos(p.heading) * speed * dt;
      p.x = clamp(p.x, -150, 150);
      p.z = clamp(p.z, -150, 150);
      // Turn around at the sidewalk edge; occasionally pick a new heading.
      if (Math.abs(p.x) > 149 || Math.abs(p.z) > 149) p.heading += Math.PI;
      if (this.rng() < 0.002) p.heading += (this.rng() - 0.5) * 2;
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.heading;
    }
  }
}

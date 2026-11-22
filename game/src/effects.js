// effects.js — explosions, muzzle flashes, hit sparks and camera shake.
export class Effects {
  constructor(scene, camera) {
    this.scene = scene; this.camera = camera;
    this.parts = []; // {mesh, vel, life, maxLife, kind}
    this.shake = 0;
  }

  spawnSphere(x, y, z, color, size, life, vel) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(size, 8, 6),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
    );
    m.position.set(x, y, z);
    this.scene.add(m);
    this.parts.push({ mesh: m, vel, life, maxLife: life, kind: 'fade' });
  }

  explosion(x, z, kind) {
    // Fireball, smoke column, sparks and a light flash.
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1 + Math.random() * 2;
      this.spawnSphere(x, 1 + Math.random() * 2, z, 0xff8020, 0.5 + Math.random() * 0.7, 0.6 + Math.random() * 0.4,
        { x: Math.sin(a) * r, y: 2 + Math.random() * 3, z: Math.cos(a) * r });
    }
    for (let i = 0; i < 6; i++) {
      this.spawnSphere(x + (Math.random() - 0.5) * 2, 3 + Math.random() * 3, z + (Math.random() - 0.5) * 2,
        0x555555, 0.9 + Math.random() * 0.8, 1.4 + Math.random() * 0.8,
        { x: (Math.random() - 0.5), y: 1.5 + Math.random(), z: (Math.random() - 0.5) });
    }
    const flash = new THREE.PointLight(0xffa040, 60, 30);
    flash.position.set(x, 3, z);
    this.scene.add(flash);
    this.parts.push({ mesh: flash, vel: { x: 0, y: 0, z: 0 }, life: 0.25, maxLife: 0.25, kind: 'light' });
    this.shake = Math.max(this.shake, 0.5);
  }

  muzzle(x, y, z, heading) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xffe080 })
    );
    m.position.set(x, y, z);
    this.scene.add(m);
    this.parts.push({ mesh: m, vel: { x: 0, y: 0, z: 0 }, life: 0.08, maxLife: 0.08, kind: 'fade' });
  }

  hitSpark(x, y, z) {
    this.spawnSphere(x, y, z, 0xffd040, 0.22, 0.25, { x: 0, y: 1, z: 0 });
  }

  update(dt) {
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 1.4);
      const s = this.shake * 0.35;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.parts.splice(i, 1);
        continue;
      }
      p.mesh.position.x += p.vel.x * dt;
      p.mesh.position.y += p.vel.y * dt;
      p.mesh.position.z += p.vel.z * dt;
      if (p.kind === 'fade' && p.mesh.material.opacity !== undefined) {
        p.mesh.material.opacity = 0.9 * (p.life / p.maxLife);
      }
      if (p.kind === 'light') p.mesh.intensity = 60 * (p.life / p.maxLife);
    }
  }
}

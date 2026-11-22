// combat.js — pistol shooting: a ray from the camera that skips the player's own car.
import { dist2d } from './util.js';

const RANGE = 70;
const DAMAGE = 15;

// Ray (origin + direction) vs a sphere: returns the distance along the ray, or null.
function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
  const lx = cx - ox, ly = cy - oy, lz = cz - oz;
  const tca = lx * dx + ly * dy + lz * dz;
  if (tca < 0) return null;
  const d2 = lx * lx + ly * ly + lz * lz - tca * tca;
  if (d2 > r * r) return null;
  const thc = Math.sqrt(r * r - d2);
  return tca - thc;
}

export function shoot(world) {
  const p = world.player;
  if (!p.hasPistol || p.pistolCooldown > 0 || world.state !== 'playing') return false;
  p.pistolCooldown = 0.25;
  const eyeY = p.inCar ? 1.35 : 1.5;
  const ox = p.x, oy = eyeY, oz = p.z;
  const dx = Math.sin(p.heading), dy = 0, dz = Math.cos(p.heading);
  let best = null, bestT = RANGE;
  const consider = (cx, cy, cz, r, hit) => {
    const t = raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r);
    if (t !== null && t < bestT) { bestT = t; best = hit; }
  };
  // Cars: skip the player's own car, skip wrecked ones.
  for (const c of world.allCars) {
    if (c === p.car || c.wrecked) continue;
    consider(c.x, 0.9, c.z, 2.4, { kind: 'car', car: c });
  }
  // Vipers (enemies).
  for (const e of world.enemies) {
    if (e.health <= 0) continue;
    consider(e.x, 1.2, e.z, 1.4, { kind: 'enemy', enemy: e });
  }
  if (world.effects) world.effects.muzzle(p.x + dx * 1.2, 1.4, p.z + dz * 1.2, p.heading);
  if (world.audio) world.audio.shot();
  if (!best) return true; // fired, hit nothing
  if (best.kind === 'car') {
    best.car.damage(DAMAGE, world);
  } else {
    best.enemy.health -= DAMAGE;
    if (world.effects) world.effects.hitSpark(best.enemy.x, 1.2, best.enemy.z);
    if (best.enemy.health <= 0) {
      if (world.effects) world.effects.explosion(best.enemy.x, best.enemy.z, 'enemy');
      if (world.audio) world.audio.explosion();
      world.enemies = world.enemies.filter((e) => e !== best.enemy);
    }
  }
  return true;
}

// minimap.js — 2D canvas minimap centred on Marlo, with ocean, roads and zoom.
import { GRID } from './city.js';

export class Minimap {
  constructor() {
    this.canvas = document.getElementById('minimap');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.zoom = 1; // 1x, 2x, 4x
  }

  cycleIn() { this.zoom = this.zoom === 1 ? 2 : this.zoom === 2 ? 4 : 1; }
  cycleOut() { this.zoom = this.zoom === 4 ? 2 : this.zoom === 2 ? 1 : 1; }

  draw(world) {
    if (!this.ctx) return;
    const g = this.ctx;
    const S = this.canvas.width;
    const cx = S / 2, cy = S / 2;
    const range = 180 / this.zoom; // half-width of the world shown
    const scale = (S / 2) / range;
    const px = world.player.x, pz = world.player.z;
    const toX = (x) => cx + (x - px) * scale;
    const toY = (z) => cy + (z - pz) * scale;

    // City base.
    g.fillStyle = '#2a2f3a';
    g.fillRect(0, 0, S, S);
    // Ocean: east (x > 168) and south (z > 168) — never painted over by the base.
    g.fillStyle = '#1a7ab8';
    if (toX(168) < S) g.fillRect(Math.max(0, toX(168)), 0, S, S);
    if (toY(168) < S) g.fillRect(0, Math.max(0, toY(168)), S, S);
    // Roads.
    g.strokeStyle = '#6a6a72';
    g.lineWidth = Math.max(1, 10 * scale);
    for (const v of GRID) {
      g.beginPath(); g.moveTo(toX(-180), toY(v)); g.lineTo(toX(180), toY(v)); g.stroke();
      g.beginPath(); g.moveTo(toX(v), toY(-180)); g.lineTo(toX(v), toY(180)); g.stroke();
    }
    // Buildings.
    g.fillStyle = '#4a4a55';
    for (const b of world.city.buildings) {
      g.fillRect(toX(b.minX), toY(b.minZ), Math.max(1, (b.maxX - b.minX) * scale), Math.max(1, (b.maxZ - b.minZ) * scale));
    }
    // Mission target marker.
    const target = world.missionTarget;
    if (target) {
      g.fillStyle = '#ffd774';
      g.beginPath(); g.arc(toX(target.x), toY(target.z), 5, 0, Math.PI * 2); g.fill();
    }
    // Police cars.
    g.fillStyle = '#ff5040';
    for (const c of world.police.cars) {
      if (c.wrecked) continue;
      g.beginPath(); g.arc(toX(c.x), toY(c.z), 3, 0, Math.PI * 2); g.fill();
    }
    // Player arrow: points along the heading (sin h, cos h) in world (x, z).
    const h = world.player.heading;
    const dx = Math.sin(h), dz = Math.cos(h);
    const ax = toX(px), ay = toY(pz);
    g.fillStyle = '#ffd774';
    g.beginPath();
    g.moveTo(ax + dx * 9, ay + dz * 9);
    g.lineTo(ax + (-dz) * 5 - dx * 5, ay + dx * 5 - dz * 5);
    g.lineTo(ax + dz * 5 - dx * 5, ay - dx * 5 - dz * 5);
    g.closePath(); g.fill();
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 1; g.stroke();
  }
}

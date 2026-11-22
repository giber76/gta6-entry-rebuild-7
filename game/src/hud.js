// hud.js — HUD: cash, wanted stars, health, speed, radio, mission, toasts.
import { MISSION_INFO } from './missions.js';

export class HUD {
  constructor() {
    this.el = {
      cash: document.getElementById('hud-cash'),
      wanted: document.getElementById('hud-wanted'),
      health: document.getElementById('hud-health-fill'),
      speed: document.getElementById('hud-speed'),
      radio: document.getElementById('hud-radio'),
      mission: document.getElementById('hud-mission'),
      objective: document.getElementById('hud-objective'),
      toast: document.getElementById('hud-toast'),
    };
    this.toastTimer = 0;
  }

  toast(text) {
    if (!this.el.toast) return;
    this.el.toast.textContent = text;
    this.el.toast.style.opacity = '1';
    this.toastTimer = 4;
  }

  update(dt, world) {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0 && this.el.toast) this.el.toast.style.opacity = '0';
    }
    if (this.el.cash) this.el.cash.textContent = '$' + world.cash.toLocaleString('en-US');
    if (this.el.wanted) {
      this.el.wanted.textContent = '★'.repeat(world.wanted) + '☆'.repeat(Math.max(0, 3 - world.wanted));
      this.el.wanted.style.color = world.wanted > 0 ? '#ff5040' : '#ffd774';
    }
    if (this.el.health) {
      this.el.health.style.width = Math.max(0, world.player.health) + '%';
      this.el.health.style.background = world.player.health > 50 ? '#40c060' : world.player.health > 25 ? '#e8a838' : '#e84030';
    }
    if (this.el.speed) {
      const kmh = world.player.inCar ? Math.round(world.player.speedKmh) : 0;
      this.el.speed.textContent = kmh + ' km/h';
    }
    if (this.el.radio) this.el.radio.textContent = '♪ ' + world.audio.radio;
    const info = MISSION_INFO[Math.min(world.mission, MISSION_INFO.length - 1)];
    if (this.el.mission) this.el.mission.textContent = info.name;
    if (this.el.objective) this.el.objective.textContent = info.objective;
  }
}

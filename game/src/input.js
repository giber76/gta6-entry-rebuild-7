// input.js — keyboard + mouse state for Solara Bay.
export class Input {
  constructor() {
    this.keys = new Set();
    this.onKeyDown = null; // (key) => void, for single-press actions
    this.onEscape = null;
    this.mouseDX = 0;
    this.dragging = false;
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'e', 'r', 'z', 'x', ' '].includes(k)) e.preventDefault();
      if (!e.repeat) {
        this.keys.add(k);
        if (k === 'escape' && this.onEscape) this.onEscape();
        else if (this.onKeyDown) this.onKeyDown(k);
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.dragging = true;
    });
    window.addEventListener('mouseup', () => { this.dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (this.dragging) this.mouseDX += e.movementX || 0;
    });
  }

  has(key) { return this.keys.has(key); }
  clear() { this.keys.clear(); this.mouseDX = 0; }
}

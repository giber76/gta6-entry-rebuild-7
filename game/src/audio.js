// audio.js — WebAudio radio (3 generated stations) and sound effects. No audio files.
export const STATIONS = ['SOLARA FM', 'BAY 97.5', 'VICE 101'];
// 16-step patterns: bass notes (semitones from A2) and lead notes.
const PATTERNS = [
  { bpm: 112, bass: [0, 0, 7, 0, 5, 0, 7, 10, 0, 0, 7, 0, 3, 5, 7, 12], lead: [12, -1, 15, -1, 12, 19, -1, 15, 12, -1, 17, 15, 12, -1, 10, -1] },
  { bpm: 96, bass: [0, -1, 0, -1, 5, -1, 0, -1, 3, -1, 0, -1, 7, 5, 3, 0], lead: [7, 12, -1, 10, 12, -1, 15, 12, 10, 7, -1, 12, 14, 12, 10, 7] },
  { bpm: 126, bass: [0, 0, 0, 7, 0, 0, 5, 7, 0, 0, 0, 7, 10, 7, 5, 3], lead: [15, -1, 12, 15, 19, -1, 17, 15, 12, 15, -1, 19, 22, 19, 15, 12] },
];

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.station = 2; // VICE 101 at boot; one R press lands on SOLARA FM.
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    this.master = null;
  }

  ensure() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.25;
      this.master.connect(this.ctx.destination);
      return true;
    } catch (err) { return false; }
  }

  start() {
    if (!this.ensure()) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    if (this.timer) return;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 90);
  }

  note(freq, time, dur, type, gain) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    o.connect(g); g.connect(this.master);
    o.start(time); o.stop(time + dur + 0.02);
  }

  schedule() {
    if (!this.ctx) return;
    const pat = PATTERNS[this.station];
    const stepDur = 60 / pat.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.25) {
      const s = this.step % 16;
      const bass = pat.bass[s], lead = pat.lead[s];
      if (bass >= 0) this.note(110 * Math.pow(2, bass / 12), this.nextTime, stepDur * 1.8, 'triangle', 0.5);
      if (lead >= 0) this.note(220 * Math.pow(2, lead / 12), this.nextTime, stepDur * 0.9, 'square', 0.12);
      if (s % 4 === 2) this.note(6000, this.nextTime, 0.03, 'sine', 0.06); // hat tick
      this.step++;
      this.nextTime += stepDur;
    }
  }

  cycle() {
    this.station = (this.station + 1) % STATIONS.length;
    return STATIONS[this.station];
  }

  get radio() { return STATIONS[this.station]; }

  blip(freq, dur, type, gain) {
    if (!this.ensure()) return;
    try { this.note(freq, this.ctx.currentTime, dur, type || 'sine', gain || 0.3); } catch (err) {}
  }

  shot() { this.blip(180, 0.09, 'square', 0.25); this.blip(90, 0.12, 'sawtooth', 0.2); }

  explosion() {
    if (!this.ensure()) return;
    try {
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(30, t + 0.5);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + 0.65);
    } catch (err) {}
  }

  mission() { this.blip(660, 0.12, 'sine', 0.3); setTimeout(() => this.blip(880, 0.18, 'sine', 0.3), 120); }
}

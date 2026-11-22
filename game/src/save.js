// save.js — localStorage save for Solara Bay.
export const SAVE_KEY = 'solara-bay-save-v1';

export function saveGame(world) {
  try {
    const data = {
      cash: world.cash,
      mission: world.mission,
      state: world.state,
      x: world.player.x,
      z: world.player.z,
      elapsed: world.elapsed,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (err) { return false; }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) { return null; }
}

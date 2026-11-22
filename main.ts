// main.ts — Solara Bay entrypoint: copies game/ + screenshots/ to /output and
// writes /output/dossier.json with buildDossier from vendor/makefun-game.ts.
// Node 22 standard library only; runs twice and writes the same bytes.
import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const repoRoot = new URL('.', import.meta.url).pathname;

// Clear only the CONTENTS of the output dir — never the dir itself, since the
// grader bind-mounts it. Chmod each directory to 0755 on the way down first,
// so a read-only directory copied in by an earlier run cannot block removal.
function clearContents(dir: string): void {
  chmodSync(dir, 0o755);
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      clearContents(p);
      rmSync(p, { recursive: true, force: true });
    } else {
      rmSync(p, { force: true });
    }
  }
}

mkdirSync(outDir, { recursive: true });
if (existsSync(outDir)) clearContents(outDir);

cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

// Coral Cover — make.fun gta6-cover-art-01 entrypoint (Node 22, no build step).
//
// Hands the app in: copies app/ and screenshots/ from this repository into
// the output directory (/output on the grader, or MAKEFUN_OUTPUT_DIR
// elsewhere) and writes /output/dossier.json with buildDossier from
// vendor/makefun-app.ts. Deterministic: the same repository writes the same
// dossier.json bytes every time (buildDossier sorts every path it reads).

import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function main(): void {
  // Start from a clean output directory so a stale file can never leak in.
  // Clear only the CONTENTS, never the directory itself: on the grader
  // /output may be a mount point, and removing it fails with EBUSY.
  mkdirSync(outDir, { recursive: true });
  for (const entry of readdirSync(outDir)) {
    rmSync(join(outDir, entry), { recursive: true, force: true });
  }

  // The app (static files) and its screenshots, copied whole.
  cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

  // The dossier: the gate's own library writes it from what was copied.
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  console.log(`Coral Cover handed in: ${outDir} (dossier.json ${dossier.length} bytes)`);
}

main();

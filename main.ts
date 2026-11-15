// EMBERFALL — entrypoint: hands the finished game in for grading.
//
// What this file does, in plain terms: it gathers the two folders that make
// up the entry (the playable game and its screenshots), drops them into the
// output directory the grader looks at, and then asks the vendored dossier
// builder to describe everything it just placed there in dossier.json.
//
// It runs on plain Node with nothing but the standard library, and it never
// touches the network. The output directory comes from MAKEFUN_OUTPUT_DIR;
// when that variable is absent the grader's own /output is used instead.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Where this program lives on disk: the repository root, next to game/ and
// screenshots/. Everything below is resolved from here, never from the
// working directory the grader happens to launch us from.
const repoRoot = dirname(fileURLToPath(import.meta.url));

// The grader points us at its output with an environment variable; outside
// the grader we fall back to the same path it would have used.
const handInDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The dossier builder's limits for this bounty: how much text it may pack,
// how many screenshots and how large each may be, and how much game it may
// describe (file count, total bytes, and the longest single path).
const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// Make the destination exist first, parents included, so the copies below
// never fail on a missing directory.
mkdirSync(handInDir, { recursive: true });

// The game itself always ships: mirror the whole folder, contents and all.
cpSync(join(repoRoot, 'game'), join(handInDir, 'game'), { recursive: true });

// Screenshots are optional on disk but their folder is always prepared, so
// the dossier step sees the layout it expects either way.
const shotsOut = join(handInDir, 'screenshots');
mkdirSync(shotsOut, { recursive: true });
const shotsIn = join(repoRoot, 'screenshots');
if (existsSync(shotsIn)) {
  cpSync(shotsIn, shotsOut, { recursive: true });
}

// Describe what was handed in. buildDossier reads the folders we just
// placed and returns the dossier as canonical JSON bytes, so the file we
// write is exactly what the builder produced — nothing added, nothing lost.
const dossier = buildDossier(handInDir, dossierCaps);
writeFileSync(join(handInDir, 'dossier.json'), dossier);

[![make.fun — Best Game 01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![EMBERFALL rank on make.fun](https://make.fun/badge/best-game-01/ragilwidiyanto4646/emberfall/rank.svg)](https://make.fun/bounty/best-game-01)
[![EMBERFALL reward on make.fun](https://make.fun/badge/best-game-01/ragilwidiyanto4646/emberfall/reward.svg)](https://make.fun/bounty/best-game-01)

# EMBERFALL — Keeper of the Last Lantern

A 2D arena survival game drawn on a canvas. You are the Keeper of the Last
Lantern: hold the light against waves of ember creatures, gather the embers
they leave behind, grow stronger with each level, and survive until dawn.

Built as an entry for the make.fun bounty
[best-game-01](https://make.fun/bounty/best-game-01) — "Make the best game".
It runs fully offline in a desktop browser from static files: no network
calls, no libraries, just plain HTML, CSS and JavaScript.

## How to play

- **Move** with WASD or the arrow keys.
- **Shoot** with the mouse — your shots fly toward the cursor.
- **Pause** with P or Esc.
- Fallen enemies drop embers. Collect them to level up and pick an upgrade.
  If the lantern burns out, the run ends.

## Run it locally

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

## Build the hand-in output

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

That copies `game/` and `screenshots/` into `out/` and writes
`out/dossier.json`, the summary the judge reads.

## Screenshots

`screenshots/` holds four real in-game captures: the title screen, a fight in
progress, a level-up choice, and the victory screen.

## License

MIT — see `LICENSE`.

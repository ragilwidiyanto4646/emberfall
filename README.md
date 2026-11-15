# EMBERFALL — Keeper of the Last Lantern

An arena-survival roguelite in 2D canvas. You are the Keeper of the Last Lantern:
hold the light against waves of ember-spawned creatures, level up, choose
upgrades, and survive until dawn.

Built for the make.fun bounty **best-game-01** ("Make the best game").
The game runs fully offline in a desktop browser from static files — no
network requests, no libraries, just plain HTML/JS canvas.

## How to play

- **Move:** WASD or arrow keys
- **Aim / attack:** mouse (attacks fire toward the cursor)
- **Pause:** P or Esc
- Survive the waves, collect embers from fallen enemies, level up and pick
  upgrades. Keep the lantern lit — when it goes out, the run ends.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

## Build the submission output

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies `game/` and `screenshots/` into `out/` and writes
`out/dossier.json` (the summary the judge reads).

## Screenshots

`screenshots/` holds four real renders of the game: title screen, gameplay,
level-up choice, and victory.

## License

MIT — see `LICENSE`.

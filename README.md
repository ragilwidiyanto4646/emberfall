# EMBERFALL — Keeper of the Last Lantern

A 2D canvas arena survival game. You play the Keeper of the Last Lantern:
fend off waves of ember creatures, gather the embers they drop, level up,
pick upgrades, and hold out until dawn.

Made for the make.fun **best-game-01** bounty. It runs completely offline in
a desktop browser, straight from static files — no network, no libraries,
just HTML, CSS and JavaScript on a canvas.

## Playing

- **Move** with WASD or the arrow keys.
- **Attack** with the mouse — shots fly toward the cursor.
- **Pause** with P or Esc.
- Enemies drop embers when they fall; collect them to level up and choose
  upgrades. If the lantern goes out, the run is over.

## Running it locally

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

## Producing the hand-in output

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

That copies `game/` and `screenshots/` into `out/` and writes
`out/dossier.json`, the summary the judge reads.

## Screenshots

`screenshots/` contains four genuine in-game captures: the title screen,
gameplay, a level-up choice, and the victory screen.

## License

MIT — see `LICENSE`.

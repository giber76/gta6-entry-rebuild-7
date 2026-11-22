# Solara Bay — Make GTA 6

[![Make GTA 6](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/giber76/gta6-entry-rebuild-7/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/giber76/gta6-entry-rebuild-7/reward.svg)](https://make.fun/bounty/gta6-01)

An original 3D open-world crime game in a sun-soaked coastal city. You are
Marlo, a driver in Solara Bay: steal cars, outrun the police, rob the bank,
and take the boss's coupe home. Six story missions, $12,000 on the line.

## How to play

- **W** drive / walk · **S** brake / reverse · **A/D** steer · **E** enter/exit car, hold E at the bank vault
- **Click** shoot the pistol · **R** cycle the radio (SOLARA FM / BAY 97.5 / VICE 101) · **Z/X** minimap zoom · **Esc** pause
- The game saves to localStorage when you win; Free Roam keeps the city open after the story.

## The story

1. **M1 — The First Coupe ($500).** Steal the coupe and take it to Rico's Garage.
2. **M2 — Lose the Heat ($1,300).** Wanted 2 — drive the outer ring road and lose the cops.
3. **M3 — The Package ($2,500).** On foot to the pier, survive the ambush, deliver to Coral Junction.
4. **M4 — Marina Showdown ($4,000).** Pistol issued — take down the 3 Vipers at Marina East.
5. **M5 — The Bank Job ($7,000).** Hold E at the vault, steal the getaway car, escape to the safehouse.
6. **M6 — The Last Job ($12,000).** Steal the boss's black coupe and bring it home to Rico's.

## The city

A 360 m grid city on the coast: traffic, pedestrians, police patrols, a
marina, a pier over the ocean, a bank, a garage and a safehouse. Three radio
stations of generated WebAudio music, a live minimap, explosions, smoke and
fire, and a wanted system that cools off when you break line of sight.

## Tech

Static files under `game/` (Three.js r159 vendored as `game/vendor/three.min.js`),
no build step, no network. `main.ts` hands the game in: it copies `game/` and
`screenshots/` to `/output` and writes `dossier.json`. Run it locally with
`node serve.ts` and play at http://localhost:8080.

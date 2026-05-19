# Wambåsa Fishing

A browser-playable Phaser/TypeScript MVP slice for a Swedish coastal factory-and-fishing game.

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The static build is written to `dist/` and uses relative asset paths so it can be hosted on GitHub Pages.

## Current Playable Loop

1. Select or drag-select the workshop operator.
2. Click the factory map to move the operator freely.
3. Pick a reel blueprint, then click generated machine sprites on the map: CNC produces to inventory, assembly mounts the built reel, stockroom buys metal. Extra reels can be sold from the factory reel cards.
4. At the harbor/fishing cabin, spend money on cabins, boats, engine upgrades, and royal cabin visits for bonus points.
4. Switch to the Wambasa fishing screen.
5. Select or drag-select the boat, click the water map to steer it, then order it to fish.
6. Use `Go Fish` and watch the player cast, wait, hook, and land fish automatically.
7. Sell fish, buy materials/upgrades, and repeat with better reels.

## Asset Pipeline

The current game uses imagegen-produced bitmap assets staged under `public/assets/generated/`:

- `factory/factory-map.png`
- `fishing/wambasa-water-map.png`
- factory unit and station sprites
- boat, fish, lure, and reel sprites

Future generated assets should follow `docs/imagegen-art-bible.md`.

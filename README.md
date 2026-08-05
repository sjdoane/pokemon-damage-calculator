# Champion Lens

Champion Lens is a fast, battle-side reference for **Pokémon Champions**. It combines a Champions-specific damage calculator, a speed checker, a six-Pokémon team builder, and current opponent usage data in one view.

It is designed for desktop browsers on Windows and macOS, with a responsive layout for smaller screens. No AI is used in the product; all results come from deterministic battle math and published battle data.

## What it includes

- Exact 16-roll damage ranges, damage percentages, and one-hit KO odds
- Pokémon Champions Lv. 50 stat math using 66 Stat Points, with a 32-point per-stat cap
- Current Regulation M-B Pokémon, forms, learnsets, sprites, Mega Evolutions, abilities, and ranked set data
- Known-set, most-common-set, maximum-bulk, and critical-hit damage scenarios
- Speed comparison with natural speed ranges, stat stages, paralysis, weather abilities, Choice Scarf, Iron Ball, and Tailwind
- Burn, poison, paralysis, sleep, freeze, stat boosts/drops, weather, terrain, screens, spread damage, current HP, and critical-hit controls
- Editable six-Pokémon team that is saved in the browser
- Private cloud library for saving multiple named teams across Windows and macOS
- Reusable Champion Lens Team IDs with one-field auto-population
- Public Champions Replica ID lookup through supported community team directories
- A **New battle** action that clears only the opponent and battle state while preserving your team
- A live scouting panel for common moves, held items, abilities, natures, Stat Point spreads, and teammates
- A one-click direction switch for calculating your move into the opponent or an opponent's likely move into your exact set

Use **My teams** to save multiple named teams to the private cloud library. Every saved team receives a Champion Lens Team ID that can be entered on another computer to restore the exact six Pokémon and their sets. The importer also checks supported public Pokémon Champions team directories for publicly shared Replica IDs. When a source exposes only the roster, Champion Lens fills in current common builds and identifies that result for review.

## Run it on Windows or macOS

Install [Node.js 22 or newer](https://nodejs.org/), then open a terminal in this folder.

Using npm:

```bash
npm install
npm run dev
```

Or using pnpm:

```bash
corepack enable
pnpm install
pnpm dev
```

Open the local address shown in the terminal, normally `http://localhost:3000`.

## Checks

```bash
npm run typecheck
npm test
```

`npm test` creates the production build and verifies the rendered battle workspace and included Champions data.

## Data and calculation sources

- Current Pokémon, forms, sprites, legal learnsets, and ranked set information: [Pokémon Champions Battle Data](https://championsbattledata.com/api_guide)
- Current Regulation M-B dates and battle rules: [official Pokémon Champions regulation notice](https://champions-news.pokemon-home.com/en/page/776.html)
- Champions Stat Point formula: [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Stat_point)
- Champions-specific move changes: [Serebii](https://www.serebii.net/pokemonchampions/updatedattacks.shtml)
- Core deterministic damage mechanics: [Smogon damage calculator](https://github.com/smogon/damage-calc)
- Public Replica team listings: [PokeFeed](https://pokefeed.app/teams) and [PokeReplicas](https://pokemonchampionsreplicateams.com/)

Champion Lens includes explicit overrides for the Champions move rebalances and signature abilities that affect damage, including Dragonize, Mega Sol, Fire Mane, and Eelevate. Battle data has a bundled fallback, while the opponent scouting panel requests the newest published rows when a connection is available.

## Important note

Champion Lens is an unofficial fan-made tool and is not affiliated with Nintendo, The Pokémon Company, Creatures Inc., or GAME FREAK. Pokémon names and imagery belong to their respective owners.

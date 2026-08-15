# Cronos Town

A self-contained pixel-art Cronos Town game with a same-origin Python backend for Cronos RPC, a Crolana-style VVS DEX terminal, NFT wallet scans, metadata, GBA-style marketplace and CroVegas casino terminals, and a browser-based map builder.

## Run locally

```bash
python server.py
```

Then open <http://localhost:4173>.

The server listens on `0.0.0.0` and uses `PORT` when provided:

```bash
PORT=8080 python server.py
```

No third-party Python packages are required.

## CroVegas

Go east from the Exchange through the compact CroVegas Forest to reach **CroVegas**. The new town contains five one-story homes, two two-story homes, and one large CroVegas Casino.

The casino contains slot machines, roulette, a casino computer, and a coin-flip cabinet. These cabinets use local demo chips only; no real CRO is transferred. The interface takes inspiration from the linked decentralized casino project’s wallet, token-credit, roulette, and game-history pattern. A deployed Cronos casino contract can be connected later for on-chain play.

## Liquidity Valley

A small town now sits west of the player's lower-town home. Only its east side has a stone boundary; the central opening is blocked by a gatekeeper NPC who explains that the road is closed and that Liquidity Valley must be reached through Wolf Street first. The valley road runs north through Wolf Street and reconnects to the Marketplace road.

## Wolf Street

Wolf Street is the west-side builder district beside the Marketplace. It contains:

- Wolf Street Token Lab: prepares a Cronos token launch plan and deploys a custom ERC-20 token directly to Cronos Mainnet via a real wallet-signed transaction (`eth_sendTransaction`), with the deployed contract address read from the on-chain receipt.
- Wolf Street AI House: five workstations for coding, image/asset ideas, social posts, company planning, and brand strategy.

The AI workstations use local drafting templates by default and can use an OpenAI-compatible endpoint configured in SmartHouse.

## Jim's Sprite Lab

Jim's Garage contains a four-by-four-tile Sprite Lab computer on a desk. Jim's catchphrase is **NautsUp!**

Upload transparent PNGs or choose from the included `sprites/` library. Presets are categorized for terrain, nature, buildings, characters, bosses, UI, and arena props. Character and NPC PNG sheets have configurable column/row grids and animate one frame at a time instead of being stretched across the whole world.

The lab shows the footprint and PNG guide for each target, plus a small live GBA screen preview that updates while a preset or PNG is being edited. The logical reference is **32 × 32 pixels per tile**; the game scales sprites responsively on screen.

## Map Builder and export

Open the builder only through **Jim's Garage → Sprite Lab PC → OPEN MAP BUILDER**. The PC now boots **Cronos World Studio OS v2**: a fixed GBA HUD with a left module rail, live world center, quick-action bar, and right-side properties inspector.

- Modules include Terrain, Buildings, Characters, Objects, UI, Audio, and Export. World management and undo/redo live in Export and the top toolbar.
- Move the player/cursor with arrows and walk through houses, trees, furniture, walls, rocks, and other blocking tiles while editing.
- The World inspector exposes the selected asset, exact anchor/footprint, bounds, layer toggles, undo/redo, expansion, and smart actions.
- Houses and other multi-tile assets use a saved footprint. Replacing a native object inherits its exact anchor, width, and height instead of leaving a one-tile construction marker.
- Terrain has paint, fill, rectangle, circle, path, auto-edge, auto-road, auto-river, and auto-forest brushes.
- Buildings and Nature include searchable asset libraries plus town-block and forest generators.
- Character Studio treats character PNGs as 4×4 sheets with 16 direction/motion frames and applies them to the Player or NPC category instead of placing the sheet as a map object.
- Add new interactive NPC World Assets with a name, dialogue, sprite sheet, and exact player-cursor placement. Added NPCs can be talked to normally in the exterior or active interior. Newly created NPCs, props, houses, water, trees, and other solid Studio assets block player movement during normal gameplay but remain fully walk-through in World Studio edit mode.
- Replacing a building preserves its door identity and interior map, so the replacement remains enterable.
- UI Studio includes a Dialog Layer that links programmable dialogue directly to existing or newly added NPCs.
- Choose any built-in asset or upload a PNG, then place it at the player cursor. Custom asset labels and footprints can be edited in the inspector.
- Build in Exterior mode or edit the active building's interior. Door and exit tiles can be reached in edit mode; press the same direction again to pass through, or use the action menu to edit/use the door.
- When the player reaches a world edge, use the World Manager or edge popup to add a new **16×16** grid chunk west, east, north, or south. The expansion buttons can be repeated with no programmed direction limit.
- Audio Studio lets the user import main game music and per-action sound effects for movement, interactions, doors, dialogue, placement, removal, and expansion. Audio, expansion bounds, removed native objects, custom replacements, studio layers, dialogue links, and uploaded sprites save in browser storage.
- Download a complete `cronos-town-custom.zip` containing the app, Python server, sprite assets, custom uploaded PNGs, and embedded map/sprite/World Studio state.

## Marketplace terminal

The large city building is the **Marketplace**. Enter it, walk to the two-tile computer sitting on the four-tile table, and press `Z`, `X`, `Space`, or `Enter` to open the terminal.

The terminal has two Cronos-only providers and now includes a feature workspace for collection browsing, item search, trait/price filters, sorting, watchlists, favorites, listing history, floor tracking, price charts, offer management, auction visibility, Cronos RPC transaction history, collection verification, and marketplace notifications:

### Ebisu's Bay · Cronos

- Reads active listings from the Ebisu's Bay API.
- Reads NFT details and wallet inventory.
- Displays collection images, seller, listing ID, and CRO price.
- Supports the Ebisu's Bay fixed-price listing flow with wallet approval, EIP-712 signing, and gasless order posting.
- Supports purchase and cancellation transaction preparation through the current Ebisu/WolfSwap gasless service.

### 0x Orderbook

- Browse open listings and offers from the Trader.xyz 0x-style orderbook.
- Create signed ERC-721 listings and offers using PACK or WCRO.
- Supports wallet inventory, approvals, EIP-712 orders, orderbook posting, and fill transaction encoding.

Every provider is hard-locked to **Cronos mainnet, chain ID 25**. Ebisu's Bay is the default provider; use the provider buttons inside the PC to switch between them.

## Backend routes

The backend is a modular Python package under `server/` (`config.py`, `security.py`,
`http_client.py`, `rpc.py`, `export.py`, and `features/`), booted through the
`server.py` shim at the repo root. Routing is centralized in `server/app.py`.

- `POST /rpc` and `GET /rpc`: proxy JSON-RPC requests to Cronos mainnet.
- `GET /api/dex-quote`: compatibility proxy for Cronos quotes through WolfSwap.
- `GET /api/wallet-scan`: scan NFT transfers through the Cronos explorer API.
- `GET /api/metadata`: fetch JSON metadata through the same-origin backend.
- `POST /api/export-project`: build a complete customized project ZIP.
- `GET /api/marketplace-config`: return the chain-25 0x marketplace configuration.
- `GET /api/marketplace-orders`: read Trader.xyz orders, forcibly scoped to chain 25.
- `POST /api/marketplace-order`: publish a signed 0x order, forcibly scoped to chain 25.
- `GET /api/ebisus-config`: return Ebisu's Bay Cronos API and contract configuration.
- `GET /api/ebisus-listings`: read active Ebisu's Bay listings, filtered to chain 25.
- `GET /api/ebisus-nft`: read one NFT through Ebisu's Bay.
- `GET /api/ebisus-wallet`: read a wallet's Cronos NFT inventory through Ebisu's Bay.
- `GET /api/ebisus-validator`: request current purchase approval data from the Ebisu/WolfSwap gasless service.
- `POST /api/ebisus-listing`: publish a signed Ebisu's Bay listing through the same-origin backend.
- `POST /api/ebisus-cancel`: request cancellation data for an Ebisu's Bay listing.

The frontend calls these routes with relative URLs, so the live preview never needs hard-coded localhost requests.

## 0x adapter configuration

The 0x provider is read-only until a deployed Cronos-compatible 0x exchange adapter is configured:

```bash
CRONOS_NFT_EXCHANGE=0xYourCronosExchangeAddress python server.py
```

The address can also be entered in the terminal and is saved in browser storage. Never enter an untrusted contract address; approvals and trades are signed by the connected Cronos wallet.

## Design references

The DEX implementation takes its Cronos VVS router configuration and direct-router flow from [Crolana](https://github.com/QUESTQUOTIENT/Crolana). The casino’s game layout and wallet/roulette/token-credit pattern takes inspiration from [Decentralized Crypto Casino](https://github.com/BraisCabo/Decentralized-Crypto-Casino). The NFT marketplace flow takes product ideas from [DexKit's open NFT marketplace](https://github.com/DexKit/open-nft-marketplace), and the Ebisu's Bay provider follows its official API and SDK shape for Cronos listings, wallet data, EIP-712 orders, and the gasless-listing contract.

## The Extended Saga & Walkthrough

For the full satirical lore, expanded district guide, NPC directory, and crypto slang glossary, see the included [WALKTHROUGH.md](WALKTHROUGH.md) (**🐺 CRONOS TOWN: THE EXTENDED SAGA — A Sarcastic Walkthrough Through Crypto Hell and Back**).

The guide covers:
- **Bull Run Basin** (`x=5 to 40, y=-20 to -1`): ETF Tower, Pump Station, Moonshot Mansion, and Airdrop Alley Office.
- **Bear Market Bunker** (`x=-20 to 5, y=-20 to -1`): Celsius Cemetery, FTX Memorial Hall, Luna Landing Crater, and VC Vaporware Vault.
- **Ape Avenue & Whale Watch Tower** (`x=91 to 115, y=0 to 35`): NFT Nonsense Emporium, Meme Coin Mint, Degen Diner, and Discord Drama Dome.
- **Diamond Hands District & Paper Hands Plaza** (`x=-50 to -24, y=0 to 63`): Hodl Hotel, Staking Sanctuary, Yield Farm, and Cold Storage Castle.
- **FOMO Falls & Rekt Ravine** (`x=-25 to 40, y=96 to 120`): Regret Riverhouse, Panic Buy Plaza, ATH Observatory, and Leverage Lagoon.
- **Crypto Slang Glossary & In-Game NPCs**: Featuring characters like `@BullBarry`, `@RektRalph`, `@NFT_Ninja`, `@HodlHero`, `@YieldYoda`, `@WhaleWendy`, `@RugRadar_Rick`, and `@FomoFiona` stationed across the town boundaries.

## Cyber-Native Interfaces & Smart Device Overhaul

All in-game PC terminals and smart interfaces now feature the **Neo-GBA Cyber-Native OLED Overhaul** documented in [`CYBER_NATIVE_OVERHAUL.md`](CYBER_NATIVE_OVERHAUL.md):
- **OLED Dark Mode & Glass Card UI**: Replaced beige terminals with `#0a0f0d` dark mode backgrounds, `#1a2e24` glass cards, and glowing `#83d1c7` / `#f3d575` neon borders.
- **SmartHouse PC ("The Citizen Dashboard")**: Integrated live Cronos ticker tape (`CRO / PACK / GAS / BLOCK`), holographic role badges (`🐋 WHALE`), security approval audit status, and AI Copilot standby readouts.
- **Exchange DEX ("WolfSwap Pro Terminal")**: Added 8-bit candlestick price history sparklines, depth meter indicators, route simulation readouts (`CRO → WCRO → VVS POOL → PACK`), and MEV protection badges.
- **Marketplace Terminal ("The Cronos Bazaar")**: Added Ebisu's Bay & 0x Orderbook masonry grid headers, real-time floor price tickers, 24h volume tracking, and rarity heatmap integration.
- **Token Lab ("Token Foundry OS v2")**: Added blueprint engineering header panels with tokenomics simulators, vesting schedules, and contract audit readouts.
- **AI House ("The Creative Dojo")**: Added multi-workstation status displays for the 5 creative workstations (Coding, Image, Social, Company, Brand).

## Full Game Audit, Feature Ratings & Complete Storyline Walkthrough

For an exhaustive feature-by-feature evaluation, numerical rating scorecard (overall **9.3 / 10**), improvement proposals, extra gameplay loops, and a complete 5-Act storyline walkthrough connecting Hometown, WolfsCity, CroVegas, and the Extended Saga border districts, see [`FULL_GAME_AUDIT_AND_WALKTHROUGH.md`](FULL_GAME_AUDIT_AND_WALKTHROUGH.md) (or [`AUDIT.md`](AUDIT.md)).

The audit covers:
1. **Executive Scorecard**: Breakdown of grades across Technical Architecture (**9.5/10**), DeFi & On-Chain Integration (**9.2/10**), UI/UX & Neo-GBA Art (**9.4/10**), Gameplay Progression (**8.5/10**), Developer Tools / Map Builder (**9.6/10**), and Environmental Lore (**9.3/10**).
2. **Feature & Use-Case Audit**: Detailed critiques, current strengths, and actionable new feature recommendations for all 10 core systems.
3. **Extra Gameplay Mechanics**: Proposals for the PACK Citizen Hierarchy Loop, Daily Dividend Loop, Gamified DeFi Quests, and Dynamic Weather Cycles.
4. **5-Act Complete Narrative Walkthrough**: Step-by-step guide from waking up in Hometown, deploying a taxed ERC-20 token in Wolf Street Token Lab, executing slippage-controlled DEX swaps, scanning NFTs in the Cronos Bazaar, and surviving Bear Market Bunker and CroVegas.

## Flipsuite Community Economy & @Flippy AI Agent Integration

Cronos Town integrates the [Flipsuite Community Rewards Engine](https://docs.flipsuite.xyz/introduction) documented in [`FLIPSUITE_INTEGRATION_GUIDE.md`](FLIPSUITE_INTEGRATION_GUIDE.md):
- **`@Flippy (@Flippy_AI)` NPC & Citizen Dashboard Terminal**: Stationed in Hometown (`x: 12, y: 80`) next to the SmartHouse. Explains the community rewards economy and opens the **`🤖 FLIPSUITE & QUESTS`** terminal.
- **Off-Chain Points System (`Flipsuite XP`)**: Accumulated by talking to town NPCs (`+15 XP` per interaction), exploring districts, and completing town tasks.
- **Point Conversions (XP-to-Chips Economy Swap)**: Citizens can convert off-chain **Flipsuite XP** into in-game **CroVegas Demo Chips** at a `1 XP = 2 Demo Chips` exchange rate.
- **Community Quests & Verification Tracker**: Interactive 5-quest task board checking for wallet connection (`Citizen Sovereignty`), DEX quote simulation (`Slippage Scholar`), token launch planning (`Token Foundry Founder`), diamond-hand dialogue (`Diamond Hands Test`), and casino play (`CroVegas High Roller`).
- **Automated Airdrops (`/airdrop`)**: Claimable once per in-game day (`gameTime`), awarding `+150 Demo Chips` and `+50 Flipsuite XP`.

## Wolfies NFT Battle Card Conversion Engine & Creature Storage Network

Accessible from the **Manager Assistant PC** (in the Warden's Hall / Manager's House `x: 10, y: 6`) and the **`🃏 CARDS (ACTIVE PARTY)`** option in the Enter Game Menu (`Enter` / `Escape`):
- **SmartHouse PC Wallet Lock**: To access the Manager Assistant PC, players must first connect their Cronos Web3 wallet at the **SmartHouse PC** (`x: 9, y: 5`), where they can also view live real-world market prices (`CRO: $0.04718 USD`, `PACK: 0.001634 CRO / 612.0 PACK/CRO`).
- **One-Wolfie-at-a-Time Conversion & Custom Naming**: The Manager Assistant PC scans your connected Web3 wallet (`0x719f...e0aff` / `/api/battle-cards/scan` in `server.py`) for **Wolfies NFTs ONLY**. Select one Wolfie at a time, assign a custom name (e.g., `Shadow Fang`), and assign one of **60 Wolfie skin traits** mapped into **7 Pokémon-style elemental types** (`🔥 FIRE`, `💧 WATER`, `🌿 EARTH`, `🐉 DRAGON`, `⚡ ELECTRIC`, `🌑 DARK`, `⚔️ FIGHTING`). Each trait grants unique power stats and a 4-move attack system.
- **Authentic Wallet Scanning & Auto-Assigned Traits**: Fictional or demo NFTs are never displayed. Scanning displays only authentic Wolfies NFTs (`0x719fdfb0ba006747a83438cc8900c8a2b35e0aff`) held in the player's connected wallet; when converting a Wolfie NFT, its skin trait and elemental type (`🔥 FIRE`, `💧 WATER`, `🌿 EARTH`, `🐉 DRAGON`, `⚡ ELECTRIC`, `🌑 DARK`, `⚔️ FIGHTING`) are automatically assigned based on the Wolfies NFT's suit trait. In the condition a user don't have any Wolfie yet, the scanner displays *"User still dont have any Wolfie yet"* and grants them a default starter Wolfie that is Electric type (`⚡ ELECTRIC TYPE` · `⚡ Starter Wolfie #000 (Astronaut)`).
- **Unlimited PC Storage vs. Active Party (`3 / 3` Cap)**: Every converted Wolfie is saved to your **PC Storage Network**. Equip up to **3 Wolfies** into your Active Party (`myBattleCardsParty`).
- **Game Menu Cards (`#party-cards-modal`)**: Press `Enter` in the overworld and select **`🃏 CARDS (ACTIVE PARTY)`** to view your 3 equipped Wolfies, full gameplay stats (`HP`, `ATK`, `DEF`, `SPD`, `CRIT`), Level info, Elo rating, and 4 trait-based attack moves.
- **Modern Tactical Card-Creature Battle Engine & Rival Trainer**: Click **`[ 🎮 BATTLE WITH THIS CARD ]`** in the Cards menu or speak to **Rival Trainer (@RivalRex)** inside the Manager's House (`x: 7, y: 6`) to test your active party in a 10-step turn-based tactical combat duel (`SYNAPSE SHOCK`, `LIQUIDITY SHIELD`, `ROLLUP STRIKE`, `OVERCLOCK SURGE`).

## Rongoon's Chess Battle Engine & Home Overhaul

Inside **Rongoons Home** (`x: 30, y: 15` in WolfsCity), players can challenge **Rongoon** to a full 8×8 game of chess as documented in [`RONGOON_CHESS_GUIDE.md`](RONGOON_CHESS_GUIDE.md):
- **Visible Chess Board on Table**: The table (`x: 10, y: 6`) is styled as a wooden table topped with an 8-bit checkerboard pattern and miniature chess pieces (`♔ ♞ ♟ ♕`) sitting on top.
- **Seated Chess Table Interaction**: Rongoon sits at the north chair (`x: 10, y: 5`). When you walk onto the opposite chair (`x: 10, y: 7`), your avatar sits down opposite him. Speaking to Rongoon directly gives conversational dialogue; the chess challenge is **activated only when you interact with the chess board on the table (`x: 10, y: 6`)**.
- **Level Selector Dialogue (`#chess-level-modal`)**: Interacting with the chess board prompts Rongoon to introduce himself as the undefeated Chess Genius and ask your skill level (**Beginner**, **Easy**, **Tuff**, or **Extreme Grandmaster**).
- **Fullscreen Chess Battle UI (`#chess-battle-ui`)**: Renders a large 64-square pixel-art board with legal move validation, pawn promotion, check/checkmate detection, move history notation, and Rongoon's AI engine commentary.
- **Grandmaster Rewards**: Defeating Rongoon by Checkmate awards **`+500 CroVegas Demo Chips`** and **`+300 Flipsuite XP`**.

## Production-Grade Transformation Roadmap (6-Phase Strategic Directive)

Cronos Town is actively governed by the **6-Phase Production Transformation Directive** documented in [`PRODUCTION_TRANSFORMATION_GUIDE.md`](PRODUCTION_TRANSFORMATION_GUIDE.md) (or `STRATEGIC_UPDATE_GUIDE.md`):
- **Phase 1: Foundation & Security**: Implemented per-IP rate limiting (`240 req/min`) and SSRF domain allowlists (`is_safe_metadata_url`) in `server.py`; added a global error boundary and non-blocking toast notification system (`#global-toast-container`) in `index.html`.
- **Phase 2: Architecture & Performance**: Roadmap for Canvas 2D/WebGL rendering migration, centralized immutable state management, and IndexedDB asset caching.
- **Phase 3: Feature Integrity & Trust**: Enforced RPC fallback providers (`CRONOS_RPC_FALLBACKS`), versioned dual local/server save schemas (`version: 1`), and server-side randomness commitment for casino sessions.
- **Phase 4: User Experience & Accessibility**: Implemented `aria-live="polite"` status readouts across all terminals and reduced-motion compliance (`prefers-reduced-motion: reduce`).
- **Phase 5 & 6: Live Operations & Compliance**: GDPR consent framework, Progressive Web App (PWA) packaging, containerized Docker deployment, and structured telemetry pipelines.

## Neo-GBA Futurist UI/UX & Gameplay Experience Audit (14 Modules & 4-Sprint Roadmap)

The game interface is structured according to the **Neo-GBA Cyber-Native Direction** documented in [`NEO_GBA_FUTURIST_OVERHAUL.md`](NEO_GBA_FUTURIST_OVERHAUL.md) (or `UI_UX_GAMEPLAY_AUDIT.md`):
- **Module A (Overworld HUD & Navigation)**: Persistent Citizen Band HUD (`#citizen-band-hud`) with clock, district badge, quest breadcrumb, wallet dot, and Flipsuite XP readout; Contextual Action Pill (`#context-action-pill` with `🅰️ TALK`, `🅰️ ENTER`, `🅰️ INSPECT`); CRT scanline Mini-Map overlay (`#minimap-overlay` bottom-right radar).
- **Module B to N (Dialog, Menus, Terminals & Accessibility)**: Neo-GBA dialog frame, memory cartridge save slots, rarity-bordered item bag, Citizen Dashboard with 2×2 holographic app grid, WolfSwap Pro Terminal with candlestick sparklines, Cronos Bazaar masonry NFT grid, World Studio OS v2 Map Builder with auto-cut sprite gallery & mouse drag-to-select, and persistent button hint footer (`#controller-hints-footer`).

## VVS Finance V3 Concentrated Liquidity (CLMM) Smart Device

Inside **Liquidity Valley House** (`x: -18, y: 67`), players can interact with the **Crolana · Cronos Liquidity Manager (Game Boy Advance Edition) Smart Device** sitting on the floor, documented in [`VVS_V3_CONCENTRATED_LIQUIDITY_GUIDE.md`](VVS_V3_CONCENTRATED_LIQUIDITY_GUIDE.md):
- **3 GBA Tabs (Add/Remove/Positions) & Vertically Stacked UI**: Switch seamlessly between adding liquidity, burning LP tokens with a custom percentage selector (`25%`, `50%`, `75%`, `100%`), and viewing active positions in Game Boy styled cards. Token A and Token B stack vertically (up and down) for zero horizontal scrolling.
- **Slippage Tolerance, Dropdown Token Importer & Genuine V3 CLMM Ratios**: Select custom slippage (`0.5%`, `1.0%`, `2.0%`), import custom 42-character EVM addresses directly from `🔍 + IMPORT 0x... ADDRESS` in Token A/B selectors, and dynamically calculate real-time accurate V3 Concentrated Liquidity quote ratios (`((sqrtP - sqrtMin) * sqrtP * sqrtMax) / (sqrtMax - sqrtP)`), **Pool Share (%)**, **LP tokens (`Math.sqrt(amountA * amountB)`)**, and USD position value against live Cronos Mainnet TVL.
- **ERC-721 / V2 LP Position Management & Fee Harvesting**: Mint Crolana LP tokens (`#10492: CRO/PACK @ 0.30% Fee Tier`), collect auto-compounded trading fees directly to wallet balance, or remove liquidity.
- **Real-World Web3 Wallet Connection, `🛠️ REPAIR RPC` & Live Mainnet Data**: Features prominent `🦊 CONNECT WEB3 WALLET` and `🛠️ REPAIR RPC` buttons supporting EIP-1193 browser wallets (`window.ethereum` / MetaMask) with automatic chain switching to Cronos Mainnet (`Chain ID 25` / `0x19`), 1-click repair for MetaMask RPC errors (`eth_getBlockByNumber` / `publicnode`), and live on-chain DEX prices fetched in real-time from `api.dexscreener.com` and `evm.cronos.org`.
- **Backend API & Cronos Mainnet RPC Connection**: Connected directly to `server.py` via `/api/vvs/status`, `/api/vvs/pairs`, `/api/vvs/price`, `/api/vvs/quote`, `/api/vvs/build-tx`, and `/api/cronos-rpc` (proxying `https://evm.cronos.org` and VVS V3 Router `0x145863Eb42Cf62847A6Ca784e6416C1682b1b2Ae`).
- **On-Chain Confirmation Only (No Fake Liquidity)**: Adding or removing liquidity and harvesting fees always requires a connected real Web3 wallet and a signed on-chain transaction. The legacy `/api/vvs/mint` simulated-mint route is disabled (returns HTTP `409`); liquidity is only ever recorded after the wallet broadcasts and the chain confirms the transaction — no fabricated tx hashes or simulated positions.

# 🐺 CRONOS TOWN: COMPLETE UI/UX & GAMEPLAY EXPERIENCE AUDIT
## *Neo-GBA Futurist Interface Direction · Use-Case Accessibility · Visual System Overhaul*

---

> **Design Philosophy:** Every screen must feel like a Game Boy Advance interface pulled 20 years into the future—cleaner grids, neon-accented pixel fidelity, and holographic depth—while ensuring **zero hidden functionality**. If a feature exists, its access point must be visible or reachable within two button presses.

---

## MODULE A: CORE OVERWORLD & HUD

### A.1 Persistent HUD Layer ("Citizen Band" — Implemented in `index.html`)
- **Top 1-Tile Horizontal Band (`#citizen-band-hud`):**
  - **Left Cluster:** 7-segment digital clock (`gameTime || 07:00`), dynamic color-coded district badge (`HOMETOWN`, `WOLFSCITY`, `WOLF STREET`, `CROVEGAS`, `LIQUIDITY VALLEY`, `INTERIOR`).
  - **Center Cluster:** Active quest breadcrumb tracking priority progression (`→ Quest: Citizen Sovereignty`, `→ Quest: Token Foundry`, `→ Quest: Challenge Rongoon`).
  - **Right Cluster:** Cronos wallet status (`🟢 0x2b0a...` / `⚫ DISCONNECTED`) and Flipsuite XP badge (`0 XP ✨`).
- **Interactive Expansion (`[H] Key` / Click):** Drops down to a 3-tile height revealing quick-access buttons (`🎒 BAG`, `🗺️ TOWN MAP`, `💾 SAVE`, `⚙️ SETTINGS`), live prices (`CRO: $0.084 🟢 · PACK: $0.0012 🟢`), and demo chip readout (`1,000 chips`).

### A.2 Contextual Action Pill (`#context-action-pill` — Implemented in `index.html`)
- **Floating Context Indicator:** Floats directly above the player's head when facing interactable objects:
  - `🅰️ TALK — <NPC Name>` when facing an NPC.
  - `🅰️ ENTER — Building` when facing a doorway.
  - `🅰️ INSPECT — <Item>` when facing an interior table, PC, or prop.
- **Chamfered Pixel Aesthetic:** Dark `#0a0f0d` background with `#83d1c7` neon border and bold monospace font.

### A.3 CRT Mini-Map Overlay (`#minimap-overlay` — Implemented in `index.html`)
- **Bottom-Right Strategic Radar:** A 4×3 tile mini-map featuring CRT scanline textures (`.minimap-scanline`) and a blinking yellow dot (`.minimap-player-dot`) tracking player coordinates in real-time.
- **Interactive Toggle (`[M] Key` / Click):** Expands to a 10×8 strategic view.

---

## MODULE B: DIALOGUE & NARRATIVE SYSTEM
- **B.1 Neo-GBA Dialog Frame:** `#0a0f0d` charcoal background with 4px grid noise pattern, neon speaker borders, 32×32 speaker badges, and keyword highlighting.
- **B.2 Choice Branches:** Vertical choice list with 4px left-border indicators and color-coded tone tints.
- **B.3 Notification Toasts:** Top-right stacked non-blocking toasts (`#global-toast-container`) across Info (cyan), Reward (gold), and Alert (red) severities.

---

## MODULE C: START SCREEN & CORE MENUS
- **C.1 Title Screen:** Slow-panning scanline background, 12×8 translucent glass menu panel, and live CRO price ticker.
- **C.2 Save/Load Grid:** Fullscreen 2×2 memory cartridge grid showing location thumbnails, timestamps, and cloud sync badges.
- **C.3 Bag/Inventory Two-Panel Grid:** Category tabs on left, 5×4 item grid on right with rarity border tints (`Common` to `Legendary`) and detail inspector modal.
- **C.4 Town Map Viewer:** Layered map displaying neon district boundaries, building icons, fog of war, and legend bar.

---

## MODULE D: BUILDING INTERIORS & ENVIRONMENTAL UI
- **D.1 Doorway Wipe & Interior HUD:** Iris transition wipes with top-left `🏠 <Building> — Floor X/Y` badge and glowing exit tiles.
- **D.2 Contextual Environmental UI:** Custom room-mode indicators (SmartHouse holographic app labels, Exchange trade hologram, Casino live status lights, Token Lab rocket fuel gauge, AI Dojo color-coded workstation auras).
- **D.3 Multi-Floor Navigation:** Glowing stairwell light rays and interactive elevator panels.

---

## MODULE E: SMART HOUSE — CITIZEN DASHBOARD
- **E.1 Full-Screen Cyber-Terminal Layout:** Top LED marquee ticker (`CRO / PACK / GAS / BLOCK`), left Citizen ID card (`🐋 CITIZEN WHALE`), and 2×2 holographic app grid.
- **E.2 AI Endpoint Console:** LED status lights, scrolling ping log, and signal-strength model picker.
- **E.3 Wallet & Security Panel:** Numeric CRO/PACK readouts, security approval shield badge (`✅ 0 UNREVOKED APPROVALS`), and transaction ledger.
- **E.4 Flipsuite & Quests Panel (`#smart-flipsuite-panel`):** XP Orb, cork-board quest notes, and daily automated community airdrop button (`🎁 CLAIM DAILY AIRDROP`).

---

## MODULE F: DEX — WOLFSWAP PRO TERMINAL
- **F.1 Split-Screen Trading Interface:** Left sell pane, right buy pane with slippage-adjusted minimum readout, center rotating swap arrow (`⇅`), and candlestick sparkline.
- **F.2 Route & Transaction UX:** Horizontal pipeline diagram (`CRO → WCRO → VVS POOL → PACK`), 4-step transaction progress bar (`QUOTE → APPROVE → CONFIRM → COMPLETE`), and gas spike warning modals.

---

## MODULE G: MARKETPLACE — CRONOS BAZAAR
- **G.1 Three-Column Browse Layout:** Left 20% filter sidebar (price range, trait chips, sort dropdown), center 60% masonry NFT grid, right 20% activity feed.
- **G.2 Listing Wizard Flow:** 3-step wizard (select NFT → set price → review listing) with smart 7-day default expiry and floor price ghost text.

---

## MODULE H: CASINO — CROVEGAS
- **H.1 Lobby Floor View:** Casino room perspective with physical machine sprites (Slot Machine 🎰, Roulette felt table, Coin Flip podium).
- **H.2 Slot Machine Lever:** Physical lever handle with spring pull animation and coin shower particle payouts.
- **H.3 Roulette Table:** Interactive felt board with stacked coin betting cursors and spinning wheel camera zoom.
- **H.4 Coin Flip Podium:** Dramatic upward toss with motion blur lines and win streak badges (`🔥 Streak: 3`).

---

## MODULE I: TOKEN FOUNDRY & AI STUDIO
- **I.1 Token Foundry OS v2:** Engineering blueprint grid, live tokenomics pie chart (`10% TEAM · 40% COMMUNITY · 30% LP · 20% MARKETING`), transfer tax selector (`0%–5%`), and 2-step missile-cover deploy switch.
- **I.2 AI Creative Dojo:** CRT monitor workstation selector (Coding, Image, Social, Company, Brand) with terminal text area and scrolling paper output.

---

## MODULE J: MAP BUILDER — WORLD STUDIO OS v2
- **J.1 True IDE Layout:** Top menu bar (`WORLD / EDIT / VIEW / ASSETS / EXPORT`), left tool palette rail, center viewport stage, and right property inspector.
- **J.2 Individual Object Target Replacement:** Replacing an NPC or building replaces **only that individual footprint**, never overwriting global `customizerSprites['npc']` or `'house'`.
- **J.3 Tileset & Sprite Extractor (`#studio-sprite-slice-modal`):**
  - **Auto-Cut Sorted Gallery (`#studio-slice-gallery`):** Automatically scans multi-sprite PNGs, discards empty transparent tiles, and displays sorted clickable thumbnails.
  - **Interactive Drag-to-Select & Box Moving:** Click and drag to draw a custom rectangular bounding box (`width × height`), or drag from inside an existing selection box to slide it across the sheet.
  - **Zero Impact on Character Sheets:** Character PNGs (`worldStudioState.module === 'characters'`) import directly as 4×4 directional walk sheets without slicing.

---

## MODULE K: CHESS BATTLE — RONGOON'S CHALLENGE
- **K.1 Throne Room Difficulty Pillars:** Seated chess table interaction in Rongoons Home (`x: 30, y: 15`). Level selector dialogue (`Beginner`, `Easy`, `Tuff`, `Extreme Grandmaster`).
- **K.2 Fullscreen 64-Square Battle Board (`#chess-battle-ui`):** Large Unicode pieces (`clamp(34px, 6.2vw, 56px)`), valid move highlighting, pawn promotion, check/checkmate detection, move history notation, and Rongoon's AI commentary.

---

## MODULE L: CUSTOMIZER — JIM'S SPRITE LAB
- **L.1 Visual Grid Category Selector:** 4×4 thumbnail grid of element categories with `"CUSTOM"` modification badges.
- **L.2 Triple Preview Layout:** Large 4× preview, in-world 5×5 mini-map context preview, and directional animation frame stepper.

---

## MODULE M: ACCESSIBILITY & GLOBAL UI PATTERNS
- **M.1 Persistent Controller Hint Footer (`#controller-hints-footer`):**
  - Displays `🅰️ SELECT · 🅱️ BACK · 🕹️ ARROWS MOVE · 📋 MENU · [H] HUD · [M] MAP · [R] TRAIL`.
- **M.2 High Contrast & Colorblind Safe Palettes:** Shape differentiation on status lights and WCAG AA contrast compliance.
- **M.3 Cognitive Accessibility & Assist:** Interaction Assist pills and ARIA polite live regions (`aria-live="polite"`).

---

## MODULE N: NOTIFICATION & WAYFINDING SYSTEM
- **N.1 4-Tier Notification Architecture:** Critical (red modal), Important (district-color top banner), Info (cyan toast), Ambient (minimap pulse).
- **N.2 Wayfinding Golden Breadcrumbs:** Interactive quest trail lines and district border transition banners.

---

## PRIORITY IMPLEMENTATION ROADMAP

### Sprint 1: Foundation Layer *(100% Implemented)*
1. Persistent Citizen Band HUD (`#citizen-band-hud` with clock, district badge, wallet dot, XP readout).
2. Contextual Action Pill (`#context-action-pill` floating over player head).
3. Translucent CRT Mini-Map Overlay (`#minimap-overlay` bottom-right radar).
4. Persistent Controller Hint Footer (`#controller-hints-footer`).

### Sprint 2: Menu Modernization *(100% Implemented)*
5. Title screen scanline background & glass panel.
6. Memory cartridge save/load slot layout.
7. Rarity-bordered item bag layout.
8. Layered town map viewer with district borders.

### Sprint 3: Feature UI Overhauls *(100% Implemented)*
9. SmartHouse Citizen Dashboard with live ticker tape & Flipsuite `@Flippy` rewards terminal.
10. WolfSwap Pro Terminal with candlestick sparklines and 4-step progress flow.
11. Cronos Bazaar masonry NFT grid & EIP-712 Orderbook.
12. CroVegas Casino room perspective & demo chip cashier.

### Sprint 4: Advanced Systems *(100% Implemented)*
13. World Studio OS v2 Map Builder with auto-cut sprite gallery & mouse drag-to-select.
14. Rongoon Chess Engine with seated table interaction & 4 AI difficulty levels.
15. Jim's Sprite Lab with category grid & custom badges.
16. Global WCAG accessibility (`aria-live`, reduced motion, GDPR consent framework).

*Built for the 2026 Cyber-Native Cronos Town Ecosystem.* 🐺✨
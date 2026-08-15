# Cronos Town — Migration Plan (Zero-Regression)

Phased extraction. The single-file app **stays fully working at every step**; each
phase is a reversible, independently-shippable commit. Revert = "stop importing the
new module, go back to the inline block."

---

## Phase 0 — Instrumentation & safety net (do first, no behavior change)
- [ ] Add `tools/verify_regression.py` (syntax + sentinels + smoke + snapshot).
- [ ] Freeze a sentinel checklist generated from the current files (DOM ids, route
      strings, security constants, economy/toast message strings).
- [ ] Add `git`-style backup: copy `index.html` + `server.py` to `baseline/` so any
      diff can be audited.
- **Gate:** harness passes on the untouched codebase (green baseline).

## Phase 1 — Inventory (data-backed, done in this doc + `tools/inventory`)
- [x] Count script blocks, declarations, DOM ids, listeners, routes.
- [ ] Emit `tools/inventory.json` — every top-level declaration with line number and
      a first-pass module classification (rendering/input/world/feature/ui/…).
- [ ] Produce the dependency map (which declarations reference which) so extraction
      order is topological (leaf-first).

## Phase 2 — Backend package split (lowest risk, highest clarity)
- [x] Create `server/` package; move pure helpers first (`security/`, `rpc/` ABI +
      block simulator, `config.py`, HMAC, rate limit, SSRF).
- [x] Move `features/` route handlers one route-group at a time
      (vvs → battle_cards → token_launch → marketplace → casino → export → metadata).
- [x] `AppHandler` is now a thin router (`server/app.py`) dispatching to feature modules.
- [x] `python server.py` still boots identically on `0.0.0.0:4173`.
- [x] Export ZIP updated to bundle the `server/` package (self-contained download).
- **Gate:** all five checks + 21-route smoke test pass.

## Phase 3 — Engine layer extraction (leaf systems first)
- [x] `engine/events/EventBus` (pure, no deps) — first module.
- [x] `engine/plugins/` — toasts, economy audit, tx queue, haptics (port interfaces
      + browser adapters; keep exact `window.__*` handles).
- [x] `engine/world/config` — world dimensions + district constants (pure).
- [x] `engine/world/bounds` — playable-rectangle bounds + normalization (pure).
- [x] `engine/world/camera` — camera bounds + clamping math (pure).
- [x] `engine/world/collision` — exterior/interior walkability + Map Builder geometry (pure).
- [x] `engine/world/time` — time-of-day phase classification (pure).
- [x] `engine/world/procedural` — tile hash, blocked filler, tall-grass patch, and
      the full deterministic road + blocked generation (byte-identical to legacy).
- [x] `engine/world/district` — district/zone detection + minimap location line (pure).
- [x] `engine/rendering/Renderer` — the rendering seam: `Renderer` interface +
      `layoutMinimap` pure draw-command layout (editor preview + game runtime +
      arena share it).
- [x] `engine/save/schema` — versioned save schema + building-label remap (pure).
- [x] `engine/input/mapping` — keyboard → movement/facing mappings (pure).
- [ ] DOM adapters for `Renderer` (the concrete `<div>`/`<canvas>` backends) +
      the entity movement pipeline — the remaining entangled DOM code.
- **Gate:** 216 unit tests lock world/camera/collision/time/district/save/input/
      procedural/rendering behavior; procedural road + blocked sets diff-verified
      byte-identical to legacy.

## Phase 4 — Domain layer (pure logic, no DOM)
- [x] `domain/dex` (VVS V3 CLMM math, quote ratio, live-price fallbacks) + unit tests.
- [x] `domain/battle` (WOLFIE_TYPE_SYSTEM, trait map, stats, starter) + unit tests.
- [x] `domain/economy` (Flipsuite XP→chips, quest board data, citizen tier) + tests.
- [x] `domain/chess` (move gen, check/checkmate/stalemate, notation) + tests.
- [x] `domain/casino` (slots/roulette/coinflip outcome rules) + tests.
- [x] `domain/token` (ERC-20 constructor ABI, byte-identical to the Python backend) + tests.
- [x] Vitest wired in; `npm test` + regression gate run the suite.
- **Gate:** 40 unit tests lock exact legacy outputs (CLMM ratios, prices, traits,
      starter, tiers, chess rules incl. fool's mate, casino payouts, ABI bytes).

## Phase 5 — UI component library
- [ ] `ui/components` (button, modal, panel, toast, status, field) extracted from
      the repeated markup/DOM patterns; all surfaces reference the components.
- [ ] `ui/styles` theme tokens (OLED `#0a0f0d`, glass `#141f1a`, neon accents,
      120ms cuts, `--world-width` / `aspect-ratio: 20/14` 1:1 tile constraint).
- **Gate:** pixel parity — tiles stay 1:1, no stretching, modal visuals identical.

## Phase 6 — Feature extraction (topological, controller+view+state per folder)
Ordered by independence: `wallet` → `token-launch` → `liquidity` → `battle-cards`
→ `marketplace` → `casino` → `flipsuite` → `ai-studio` → `sprite-lab` → `chess`
→ `smart-menu` → `editor`. Each move: lift the `const`/`let` block, convert
cross-refs to imports, keep the exact DOM ids + message strings.
- [x] `token-launch` (pilot — full controller/view/state, on-chain deploy).
- [x] `casino` (play slots/roulette/coinflip + claim chips + connect; consumes
      domain/casino outcomes + economy audit ledger).
- [x] `wallet` (connect flow, chain-25 switch, PACK balance role resolution with
      public-RPC fallback; consumes domain/wallet tiers + WalletEvents).
- [x] `flipsuite` (@Flippy quests + daily airdrop + XP→chips conversion; consumes
      domain/economy tiers + conversion rate).
- [x] `chess` (Rongoon AI move selection at 4 levels + commentary + grandmaster
      reward; consumes domain/chess move gen + evalChessBoard).
- [x] `battle-cards` (Wolfies scan/convert/equip-unequip + default starter +
      auto-assigned suit trait + 3-card party cap; consumes domain/battle).
- [x] `smart-menu` (SmartHouse PC menu state + smart-action dispatch to ai/wallet/
      flipsuite/battle-cards/close).
- [x] `liquidity` (Crolana V3 add/remove/positions/fees; strict wallet gate + no
      simulated fallback; consumes domain/dex pool stats + wallet/rpc ports).
- [x] `marketplace` (domain helpers: address/token-symbol/unit formatting + listing
      record extraction; consumes domain/market).
- [x] `ai-studio` (5 creative workstations: local drafts + AI-backed drafts with
      local fallback; consumes ai-studio/roles).
- [x] `sprite-lab` (58-preset catalog + 16 targets + allowed-preset filtering +
      apply/reset/save draft state; consumes sprite-lab/presets).
- [x] `editor` (pure state schema + normalization [Jim's Garage restore, bounds
      truncation, studio default-merge] + brush engine [fill/rect/circle/path/
      auto-road/river/edge/forest] + edge expansion math; consumes editor/studio-state
      + editor/brushes).
- [ ] `editor` DOM pipeline (asset placement, grid rendering, inspector) — the
      final entangled piece.
- **Gate after each:** full harness + manual smoke of that feature.

## Phase 7 — Event bus adoption
- [ ] Replace direct cross-feature calls with `EventBus.emit/on`
      (`wallet:connected` unlocks Manager Assistant PC; `liquidity:added` updates
      audit + toast + haptics; etc.). Pure wiring change, zero copy change.

## Phase 8 — History engine
- [x] `history/` shared snapshot-based undo/redo (40-cap, future-clear-on-record),
      faithful to the legacy World Studio history. Adopted by the editor, game,
      and app; the Map Builder undo/redo is the first consumer.
- [x] `engine/economy/audit` — immutable economy audit ledger (Phase 3.3), faithful
      to `window.__EconomyAuditLog` (entry shape, newest-first, 100-cap, random
      id/hash), with injectable persistence + randomness.
- [ ] Command-style history and diff/timeline/restore views (future).

## Phase 9 — De-duplication & cleanup
- [ ] Collapse duplicated DOM builders (modal scaffolding, list renderers, toast
      templates) into shared components. No behavior/copy change.

## Phase 10 — Tests & performance
- [ ] Node-based unit tests for domain + engine; end-to-end smoke for features.
- [ ] Performance re-baseline (startup, first frame, canvas FPS) vs. baseline —
      must be within tolerance.

---

## Non-negotiables (guardrails every phase must respect)

- **Ship-blocking security** stays intact: rate limit `1200 req/min`, SSRF allowlist,
  HMAC session, RPC fallback, `REPAIR RPC` self-heal.
- **Wallet enforcement** stays strict: no simulated liquidity/deploy, no fake tx
  hashes, success only after on-chain confirmation.
- **Neo-GBA theme + 1:1 tiles**: `--world-width: min(100vw, calc(100vh * 1.428571))`,
  `aspect-ratio: 20/14`, 120ms cuts — never regress.
- **All 32 systems + Wolfies 7-type engine + Default Electric Starter** preserved
  with identical copy (e.g. *"User still dont have any Wolfie yet"*).
- **Deployment contract**: backend is still `python server.py` (same-origin). The
  modular frontend builds with `npm run build` (Vite) and is served statically;
  dev uses `npm run dev` with a `/api` + `/rpc` proxy to the Python server.

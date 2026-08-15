# Cronos Town — Modular Architecture (Zero-Regression Migration)

> **Principle: behavior preservation with structural refactoring.**
> The game must look, play, and behave identically to the user. Internally, every
> use case becomes an independent module connected through a central engine. No
> redesign, no feature additions, no removals.

---

## 1. Current state (measured, not guessed)

| Artifact | Lines | Content |
|---|---|---|
| `index.html` | ~18,950 | 2 inline `<script>` blocks, ~566 KB JS |
| — declarations | 2,250 | 2,022 `const` · 224 `let` · 4 `function` (single shared closure) |
| — DOM ids | 359 | all UI surfaces (terminals, modals, HUD) |
| — event listeners | ~215 | 163 `click`, 23 `change`, 16 `input`, 5 `keydown`, drag/drop, error/rejection bounds |
| `server.py` | ~1,400 | 20 top-level functions + 1 `AppHandler`, ~35 routes |

**Key structural reality:** the frontend is one giant closure. Every `const`/`let`
shares a single scope and cross-references freely (e.g. `mintVvsV3LpPosition` reads
`crolanaWeb3Connected`, `v3StatusReadoutEl`, `createToastNotification`,
`window.__EconomyAuditLog`). This is why the migration is **extraction**, not
**rewriting** — we lift declarations into modules and replace cross-references with
explicit imports, never re-authoring logic.

---

## 2. Target layered architecture (TypeScript + Vite + Python)

> Decision (locked with the user): **TypeScript + Vite bundler** for the frontend,
> Python package for the backend. The modular app lives under `studio/` during the
> migration so the legacy single-file app stays fully working at the root until
> every feature is ported and verified.

```
src/
├── main.js                     # bootstrap: wires engine + features + history
│
├── engine/                     # one engine, many consumers (game, editor, UI preview)
│   ├── rendering/              # canvas renderer, tile/camera/sprite pipeline
│   ├── input/                  # keyboard + pointer dispatch
│   ├── audio/                  # SFX + music bus
│   ├── world/                  # map model, districts, interiors, collisions
│   ├── entity/                 # player, NPCs, creatures
│   ├── save/                   # memory-cartridge persistence, import/export
│   ├── assets/                 # sprite registry, custom PNG loader
│   ├── events/                 # EventBus + typed event payloads
│   └── plugins/                # haptics, toasts, economy audit, tx queue
│
├── domain/                     # business logic + engine systems (pure, no DOM)
│   ├── economy/                # Flipsuite XP/chips, audit ledger, quests
│   ├── battle/                 # Wolfies types, stats, tactical arena rules
│   ├── chess/                  # Rongoon chess engine (move gen, check/checkmate)
│   ├── dex/                    # VVS V3 CLMM math, quote/ratio, route selection
│   ├── market/                 # orderbook + Ebisu's Bay domain models
│   ├── casino/                 # provably-fair seed/commitment logic
│   └── token/                  # ERC-20 constructor ABI encoding
│
├── features/                   # every use case = its own folder (controller+view+state)
│   ├── wallet/                 # SmartHouse PC, Crolana wallet, RPC repair
│   ├── token-launch/           # Wolf Street Token Lab (prepare/connect/deploy)
│   ├── liquidity/              # Crolana GBA add/remove/positions/fees
│   ├── battle-cards/           # Wolfies scan, conversion, storage, party, arena
│   ├── marketplace/            # Ebisu's Bay + 0x terminal
│   ├── casino/                 # CroVegas cabinets + clerk
│   ├── flipsuite/              # @Flippy terminal + quests
│   ├── ai-studio/              # 5 creative workstations
│   ├── editor/                 # World Studio OS v2 map builder
│   ├── sprite-lab/             # Jim's Garage uploads/presets
│   ├── chess/                  # Rongoon challenge UI
│   └── smart-menu/             # Enter-menu (party cards, stats, etc.)
│
├── ui/                         # reusable Neo-GBA component library
│   ├── components/             # button, modal, panel, toast, status, field
│   └── styles/                 # OLED theme tokens (#0a0f0d etc.), 120ms animations
│
├── history/                    # one history engine shared by editor + game
│   ├── commands/ undo/ redo/ snapshots/ timeline/ diff/ restore/
│
└── data/                       # local cache, key prefixes, migrations
```

### Backend package (same layering, Python)

```
server/
├── __main__.py                 # ThreadingHTTPServer bootstrap (was `if __name__`)
├── app.py                      # AppHandler — a thin router (rate-limit + dispatch)
├── config.py                   # chain id, RPC endpoints, contract addrs, data tables
├── security.py                 # HMAC, casino seed commitment, rate limit, SSRF
├── http_client.py              # fetch_json / post_json / delete_json helpers
├── rpc.py                      # proxy, fallback block-object simulator, ABI, NFT scan
├── export.py                   # project zip builder + export routes
└── features/
    ├── vvs.py                  # pairs, quote, build-tx, CLMM math, live prices
    ├── battle_cards.py         # Wolfies scan + starter + trait mapping
    ├── token_launch.py         # ERC-20 deploy build-tx
    ├── marketplace.py          # ebisus + 0x proxies
    ├── casino.py               # seed commitment + verify
    └── misc.py                 # session-token, remote-config, wallet-scan, metadata
```

> ✅ **Phase 2 complete** — `server.py` is now a 9-line boot shim; all 21 backend
> routes smoke-tested identical; the export ZIP bundles the package.
>
> ✅ **Phase 4 complete** — `studio/src/domain/` holds six pure modules (dex, battle,
> economy, chess, casino, token) locked by 40 unit tests; the token ABI encoder is
> byte-identical to the Python backend.
>
> 🔄 **Phase 3 in progress** — `studio/src/engine/` now has events (EventBus +
> typed events + ports/adapters), world (config/bounds/camera/collision/time/
> procedural), save (schema), input (mapping), history (HistoryEngine), and
> economy (audit ledger), locked by 100 unit tests. The procedural road (1515
> cells) + blocked (1955 cells) sets are diff-verified byte-identical to legacy.
> The DOM-based rendering/entity pipeline is the remaining entangled portion.

---

## 3. Module boundary rules (the discipline)

1. **Features never reach into other features.** A feature emits events and reads
   its own state; it never calls another feature's controller directly.
2. **Domain modules are pure** (no `document`, no `window`, no `fetch` side effects
   beyond injectable ports). The engine supplies ports.
3. **UI never holds logic** — views render state and emit intents; controllers own
   behavior; state objects are plain data with a single owner.
4. **All cross-module communication flows through `engine/events/EventBus`.**
5. **Every mutable state lives under `src/` + `src/data/`, nowhere global.**
   The existing `window.__EconomyAuditLog` and `window.__CronosTxQueue` become
   engine plugins that keep their exact `window` handles for backward compat.

### Event bus (backward-compatible)

```js
// engine/events/EventBus.js
const bus = { on, off, emit, once };
// typed events:
// wallet:connected, wallet:disconnected, project:opened, project:saved,
// asset:imported, canvas:selection-changed, map:loaded, quest:completed,
// history:snapshot, liquidity:added, liquidity:removed, fees:collected,
// token:deployed, card:converted, card:equipped, battle:ended, ...
```

Every existing `createToastNotification(...)` / audit `.record(...)` / haptic
`triggerHapticFeedback(...)` call site becomes an event emit, preserving the
**exact** message strings and sequencing.

---

## 4. Zero-regression verification gate

The single-file build is the source of truth until the modular build is proven
byte-for-byte equivalent. Every phase ends with:

```bash
python3 tools/verify_regression.py
```

which enforces:
1. **JS syntax**: extract all inline scripts → `node -c` (must pass).
2. **Python syntax**: `py_compile` on every `.py` (must pass).
3. **Sentinel integrity**: a checklist of 400+ markers (DOM ids, feature strings,
   security constants, economy messages) must all still exist — no feature dropped,
   no copy changed.
4. **Endpoint smoke test**: boot `server.py`, curl the canary routes
   (`/api/battle-cards/scan`, `/api/token-launch/build-tx`, `/api/vvs/quote`,
   `/api/vvs/status`) and diff shape.
5. **Behavior snapshot**: capture the rendered DOM/first-frame against a baseline.

Nothing is deleted until its module is wired and all five gates pass.

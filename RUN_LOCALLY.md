# 🐺 Cronos Town — Run Locally

This package contains the **complete, updated Cronos Town** — both the legacy
single-file game and the new modular architecture — ready to run on your machine.

## What's inside

```
cronos-town/
├── index.html            ← The full game (Neo-GBA pixel-art RPG + DeFi terminals).
├── server.py             ← Python backend boot shim (thin entry point).
├── server/               ← Modular backend package (config, security, rpc, features).
├── tools/                ← Zero-regression verification harness + sentinels.
├── studio/               ← NEW modular TypeScript architecture (Vite + Vitest).
├── README.md             ← Full project documentation.
└── RUN_LOCALLY.md        ← This file.
```

---

## ⚡ Quick start — run the game (the easiest path)

The game is a single-page app served by a small Python backend. **Python 3 only —
no other packages required.**

```bash
# from the project root
python3 server.py
```

Then open **http://localhost:4173** in your browser.

That's it. The server listens on `0.0.0.0:4173` (override with `PORT`):

```bash
PORT=8080 python3 server.py
```

> **Tip:** you can also open `index.html` directly in a browser to view the game
> UI, but the backend (wallet scan, VVS pricing, NFT metadata, RPC proxy) needs
> `python3 server.py` running for full functionality.

### What the backend gives you

| Endpoint (examples) | Purpose |
|---|---|
| `POST /api/battle-cards/scan` | Scan a wallet for Wolfies NFTs (⚡ default starter) |
| `POST /api/token-launch/build-tx` | Build an ERC-20 deploy transaction |
| `POST /api/vvs/quote` | VVS V3 concentrated-liquidity quote ratio |
| `GET /api/vvs/pairs` / `/api/vvs/status` | Live Cronos pool prices |
| `POST /rpc` / `GET /rpc` | Cronos mainnet JSON-RPC proxy |

All routes are same-origin (relative URLs), so no hard-coded hosts to configure.

---

## 🧱 Run the modular architecture (the new codebase)

The re-architected code lives in `studio/` — a **TypeScript + Vite** project with
a layered design (engine / domain / features / UI) and a full **Vitest** suite
(216 tests locking behavior parity with the legacy game).

Requires **Node.js 20+** and **npm**.

```bash
cd studio
npm install          # install dev deps (TypeScript, Vite, Vitest)
```

### Run the dev server (live preview)

```bash
npm run dev          # Vite dev server on http://localhost:5173
```

The dev server **proxies** `/api` and `/rpc` to the Python backend, so keep
`python3 server.py` running in a second terminal to use real data.

### Typecheck + build

```bash
npm run build        # tsc --noEmit + vite build → dist/
npm run typecheck    # just the TypeScript strict check
```

### Run the test suite

```bash
npm test             # vitest run (216 tests)
```

### Verify zero regression (both apps)

From the project **root**:

```bash
python3 tools/verify_regression.py           # syntax + sentinels + modules + tests
python3 tools/verify_regression.py --smoke   # also boots the backend + curls routes
```

This harness enforces that the modular migration never breaks the legacy app:
JS syntax, Python syntax, 76 sentinel strings, module index, TS build, unit
tests, and endpoint smoke checks.

---

## Architecture in 30 seconds

```
studio/src/
├── main.ts               ← composition root (wires ports + features)
├── engine/               ← one engine, many consumers
│   ├── events/           ← typed EventBus
│   ├── ports.ts          ← ToastPort / AuditPort / WalletPort / RpcPort / …
│   ├── world/            ← config, bounds, camera, collision, time, procedural, district
│   ├── rendering/        ← the Renderer seam + pure draw-command layout
│   ├── save/, input/, history/, economy/
│   └── adapters/         ← browser-wallet, in-memory toasts/audit/haptics
├── domain/               ← pure business logic (dex, battle, chess, casino, …)
└── features/             ← every use case = types/state/controller/view (+ index)
    ├── token-launch/ casino/ wallet/ flipsuite/ chess/ battle-cards/
    ├── smart-menu/ liquidity/ marketplace/ ai-studio/ sprite-lab/ editor/
```

The backend mirrors the same layering:

```
server/
├── app.py               ← thin router (rate-limit + dispatch)
├── config.py  security.py  http_client.py  rpc.py  export.py
└── features/            ← vvs, battle_cards, token_launch, marketplace, casino, misc
```

Key principle: **behavior preservation with structural refactoring.** The legacy
`index.html` is byte-identical throughout; every extraction is a 1:1 port locked
by tests.

---

## Requirements summary

| App | Requires |
|---|---|
| Game + backend | Python 3 (no pip installs) |
| Modular studio | Node.js 20+ + npm |

## Troubleshooting

- **Port 4173 in use** → `PORT=8080 python3 server.py`.
- **Vite preview host blocked** → `vite.config.ts` already sets `allowedHosts: true`
  and `host: '0.0.0.0'`.
- **`npm test` fails with missing vitest** → run `npm install` first (deps aren't
  bundled; they're reinstalled on demand).
- **Wallet/RPC errors in the game** → use the in-game `🛠️ REPAIR RPC` button to
  switch MetaMask to the reliable Cronos PublicNode endpoint.

Enjoy Cronos Town! 🐺

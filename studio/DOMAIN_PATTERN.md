# Domain Layer Pattern

Domain modules are the **pure business logic** of the game — no `document`, no
`window`, no `fetch`. They are extracted 1:1 from the legacy single-file app and
locked with unit tests so any future change that alters behavior fails loudly.

## What goes here

Any function that computes a value from inputs alone:

- `domain/dex.ts` — VVS V3 CLMM math (`getV3ClmmQuoteRatio`, `getV3PairPrice`,
  `getTokenUsdPrice`, `getPoolTvlUsd`, `computePoolStats`), price formatting.
- `domain/battle.ts` — the Wolfies 7-element type system, 60-trait map,
  `getWolfieTraitData`, `DEFAULT_STARTER_WOLFIE`.
- `domain/economy.ts` — Flipsuite XP→chips conversion, quest board data,
  citizen tier thresholds.

## What does NOT go here

Anything touching the DOM, wallet, network, or mutable game state. That belongs
in a **feature** (`controller` + `view` + `state`) or an **engine adapter**.

## Rules

1. **Pure** — same inputs → same outputs, no side effects.
2. **Faithful** — ported verbatim from `index.html`, including legacy quirks
   (e.g. the shadowed `CRO_PACK: 50.0 → 612.0` duplicate key that caused the
   "1637 CRO" bug is encoded as its effective final value, with a comment).
3. **Tested** — every module has a `tests/` spec that asserts the exact legacy
   numeric/string outputs.

## Running the tests

```bash
cd studio
npm test            # vitest run
```

The full regression gate (`python3 tools/verify_regression.py --smoke`) also runs
the unit suite automatically.

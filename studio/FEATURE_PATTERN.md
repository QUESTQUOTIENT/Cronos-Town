# Feature Extraction Pattern (the contract every module follows)

This is the **single convention** used to lift a use-case out of the legacy
single-file `index.html` and into the modular TypeScript app. The pilot
(`features/token-launch`) is the reference implementation. Every subsequent
feature copies this shape exactly.

## Directory contract

```
src/features/<feature>/
├── types.ts        # all public types (form/state/result/DTOs)
├── state.ts        # plain-data state + pure reducers (single owner)
├── view.ts         # DOM projection only — reads form, renders state, reports intents
├── controller.ts   # the use-cases (prepare/connect/deploy…), zero DOM logic
└── index.ts        # ONLY public surface others may import (create<Feature>Feature)
```

## Rules

1. **Features never import another feature.** They import only:
   - `engine/events/*` (bus + typed events)
   - `engine/ports` (interfaces)
   - their own files
2. **Views hold no logic.** Views project state → DOM and DOM → intents. All
   decisions live in the controller.
3. **State has one owner.** It is plain data; only the feature's own controller
   mutates it (via pure reducers in `state.ts`).
4. **All side effects are ports.** `fetch`, `window.ethereum`, toasts, audit,
   haptics — every one goes through a port injected by `main.ts`. Tests inject
   fakes.
5. **Cross-feature messages are events.** A feature emits `bus.emit(...)` and
   never calls another controller.
6. **Copy is sacred.** Message strings, status lines, and flow are a 1:1 port of
   the legacy code. If the legacy string changes, the port changes — never the
   reverse.

## Wiring a new feature

1. Create the five files under `src/features/<feature>/`.
2. Add its typed events to `src/engine/events/events.ts`.
3. Add any new port interfaces to `src/engine/ports.ts` (reuse existing ones
   where possible) and provide an adapter in `src/engine/adapters/`.
4. Assemble it in `src/main.ts` (composition root) — inject ports + elements.
5. Add the module paths to `src/module-index.json`.
6. Run `python3 tools/verify_regression.py --smoke` — all gates must stay green.

## Ports available today

| Port | Interface | Legacy equivalent |
|---|---|---|
| `ToastPort` | `notify(msg, tone)` | `createToastNotification(msg, tone)` |
| `AuditPort` | `record(event, detail, amount)` | `window.__EconomyAuditLog.record(...)` |
| `HapticsPort` | `effect(name)` | `triggerHapticFeedback` / `worldStudioPlayEffect` |
| `WalletPort` | `isAvailable / getAddress / connect` | `window.ethereum` + `ensureDexWallet` |
| `RpcPort` | `sendTransaction / waitForReceipt` | `eth_sendTransaction` + `waitForDexReceipt` |

# Chronos Studio ownership model

`StudioProject` is the canonical authored-object store. It is intentionally shared by the studio shell, runtime integrations, project graph, and project exporter: an editor must never create a private copy of data that the game does not use.

## Object types

The first schema covers `ui`, `npc`, `story`, `quest`, `world`, `network`, `token`, `economy`, `nft-collection`, `character`, `audio`, and `automation`. Each object has an ID, display name, JSON-safe runtime data, and typed references to other owned objects.

`StudioProject.upsert()` updates both the object store and `ProjectGraph`. Replacing references also replaces graph edges, so search and impact analysis immediately answer questions such as “what changes if this token or network changes?”

## Network and economy

`configureNetwork()` validates the chain and RPC endpoint. `configureToken()` requires an existing network and links the token to it. Economy, marketplace, quest, and wallet objects can reference the token rather than repeat chain configuration.

## Export contract

`StudioOS.snapshot()` includes `studio`, a `chronos-studio-project` v1 snapshot. Clients send that value as `studioProject` to `/api/export-project`. The generated archive contains the same snapshot at `studio/project.json`, the runtime export payload, and the editable StudioOS source (`studio/src`, tests, and build configuration). This makes the exported game and the editable studio source travel together.

This is a foundation, not a claim that every visual editor is complete. New panels should author these objects through `StudioProject`, and runtime systems should resolve their settings from these object IDs.

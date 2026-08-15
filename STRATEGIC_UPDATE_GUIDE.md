# 🐺 CRONOS TOWN: COMPLETE STRATEGIC PRODUCTION TRANSFORMATION GUIDE
## *Directional Mandates for Production-Grade Architecture, Security, and Live Operations*

---

> **Overview:** This document establishes the strict engineering, security, and architectural mandates required to evolve Cronos Town from a prototype into a production-grade, server-authoritative, cyber-native RPG and DeFi platform.
> 
> **Core Policy:** Zero deviation from the **6-Phase Transformation Roadmap** and **Ship-Blocking Security Mandates**.

---

## PHASE 1: FOUNDATION & SECURITY (Weeks 1–3)
*Status: SHIP-BLOCKING. Zero new feature expansion until Phase 1 & 2 architecture is solidified.*

### 1.1 Monolithic Decomposition Mandate
- **Module Boundary Policy:** Every subsystem (rendering, physics, blockchain, UI, audio, save system, editor) must operate in isolated scope with explicit import/export contracts.
- **Dependency Injection:** The game engine, blockchain adapter, UI renderer, and audio manager must be instantiated as separate services and injected via constructor parameters or a central service registry.
- **Scene Graph Abstraction:** World entities (tiles, NPCs, buildings, props) must be represented as data objects first, decoupled from DOM nodes.
- **Message Bus Architecture:** Subsystems communicate exclusively through typed events (e.g., player movement intents emit events validated by the collision engine before visual updates occur).

### 1.2 State Authority Migration
- **Server-Authoritative Persistent Progression:** Player coordinates, inventory contents, quest completion, and experience points must be validated by the Python backend.
- **Cryptographic Integrity for Local Projects:** Map editor projects and sprite customizations must be signed with an HMAC session secret to reject tampered payloads.
- **Volatile vs. Persistent Separation:** Transient runtime UI state remains client-side; persistent progression must pass through server authority or signed local vaults.

### 1.3 Input & Output Sanitization Mandate
- **Strict Text-Content Policy:** Dynamic strings in UI (NFT names, dialogues, listings) must be escaped to prevent XSS. String concatenation for HTML injection is prohibited.
- **Content Security Policy (CSP):** Enforce strict CSP headers blocking inline script injection and restricting image/script origins.
- **Metadata Schema Validation:** All third-party NFT metadata schemas fetched via `/api/metadata` are strictly validated before display.

### 1.4 Error Resilience & Observability
- **Global Error Boundary:** Captured in `window.addEventListener('error', ...)` and `unhandledrejection` to gracefully degrade UI and log context.
- **Non-Blocking Toast Notifications (`#global-toast-container`):** Surface actionable system, RPC, and wallet alerts without freezing the game loop.
- **Client-Side Telemetry:** Forward uncaught errors and stack traces to centralized logging.

### 1.5 Server Hardening (Implemented in `server.py`)
- **Per-IP Rate Limiting:** Enforces sliding-window rate limiting (`RATE_LIMIT_MAX_REQUESTS = 240 req/min`) on all API and RPC proxy routes. Exceeding limits returns HTTP `429 Too Many Requests`.
- **SSRF Allowlist Protection (`is_safe_metadata_url`):** Restricts metadata proxying to external HTTP/HTTPS domains, blocking localhost, `127.x.x.x`, `169.254.x.x`, `10.x.x.x`, and `192.168.x.x` internal IP ranges.
- **Export Endpoint Hardening:** ZIP exports use cryptographically secure hex names (`secrets.token_hex`), isolated storage, and automated cleanup.
- **Payload Schema Checking:** Validates content-length and structure on JSON POST bodies before processing.

---

## PHASE 2: ARCHITECTURE & PERFORMANCE (Weeks 3–6)

### 2.1 Rendering Engine Migration
- **Canvas 2D / WebGL Context Migration:** Migrate world tile rendering from DOM divs to a unified canvas using texture atlases. Reserve DOM exclusively for Cyber-Native UI overlays.
- **Camera Culling:** Render only tiles and entities within the viewport plus a 1-chunk margin.
- **Transform-Only Animations:** Use CSS `transform` or direct canvas coordinate translation; avoid properties triggering layout recalculations.

### 2.2 State Management Formalization
- **Centralized Immutable Store:** Dispatch all game state mutations through an immutable state container where UI components subscribe to specific state slices.
- **Time-Travel Debugging & History:** Use chronological action logging to power World Studio Map Builder undo/redo stacks.
- **Entity Normalization:** Store buildings, NPCs, and items in flat lookup tables by ID rather than deeply nested structures.

### 2.3 Memory Lifecycle Governance
- **Lifecycle Interface (`mount / update / destroy`):** Enforce explicit destruction of child containers on scene dismissal.
- **Timer Registry:** Centralize all timers (`setTimeout`, `setInterval`) to auto-cancel upon scene unload.
- **Object Pooling:** Recycle ephemeral entities (floating text, particles) from pre-allocated pools.

### 2.4 Asset Pipeline Formalization
- **IndexedDB Blob Storage:** Store large custom PNG uploads in IndexedDB rather than localStorage to prevent 5–10 MB storage exhaustion.
- **Async Web Worker Loading:** Process image decoding off the main thread.
- **Asset Versioning:** Validate cached assets against version hashes on startup.

---

## PHASE 3: FEATURE INTEGRITY & TRUST (Weeks 4–7)

### 3.1 Randomness Authority
- **Server-Side Seed Commitment:** Generate cryptographically secure seeds on the server for casino sessions, revealed post-game for fairness verification.
- **Verifiable Random Function (VRF):** Use on-chain VRF oracles for live mainnet casino deployments.

### 3.2 Blockchain Interaction Reliability
- **Transaction Queue & Nonce Manager:** Sequentially queue outgoing transactions to prevent parallel duplicate clicks and nonce collisions.
- **RPC Fallback Strategy:** Enforce automatic fallback between primary Cronos RPC (`https://evm.cronos.org`) and secondary public endpoints (`https://cronos-evm.publicnode.com`).
- **Persistent Transaction Indicators:** Display clear pending transaction spinners and confirmation toasts.

### 3.3 Economy Integrity & 3.4 Save System Resilience
- **Server Liabilities & Audit Logging:** Record all economic events (demo chips, Flipsuite XP, conversions) in append-only logs.
- **Versioned Dual-Save Schema:** Enforce schema versioning (`version: 1`) with automatic migration and dual local/server conflict resolution.

---

## PHASE 4: USER EXPERIENCE & ACCESSIBILITY (Weeks 5–8)
- **4.1 Roving Focus & Trapping:** Standardize roving focus and modal focus trapping across all dialogs.
- **4.2 Accessibility Compliance (`aria-live`, Reduced Motion):**
  - Implement `aria-live="polite"` on all status readouts.
  - Respect `@media (prefers-reduced-motion: reduce)` to disable animations when requested.
- **4.3 Safe-Area & Adaptive UI:** Use `env(safe-area-inset-*)` and responsive `clamp()` typography.
- **4.4 Feedback Layer:** Combine haptic feedback, particle bursts, and stacked toast notifications.

---

## PHASE 5: LIVE OPERATIONS & GROWTH (Weeks 6–10)
- **5.1 Analytics Instrumentation:** Track session milestones, DEX conversion funnels, and anonymized privacy opt-outs.
- **5.2 Remote Configuration & Feature Flags:** Fetch remote manifests controlling building availability, casino rates, and feature flags.
- **5.3 Social Presence & Guild Housing:** Add lightweight online presence indicators and shared bulletin boards.
- **5.4 Monetization Infrastructure:** Support dual-currency (free XP/Chips vs. premium cosmetics) and seasonal battle pass tracks.

---

## PHASE 6: COMPLIANCE & PLATFORM READINESS (Weeks 8–10)
- **6.1 Privacy Framework:** Enforce GDPR consent banners, data export/deletion portals, and anonymized wallet logs.
- **6.2 PWA & Store Compliance:** Support Service Worker offline caching, "Demo Chip" gambling disclaimers, and platform IAP compliance.
- **6.3 Operational Readiness:** Containerize Python backend in Docker with blue-green staging and automated incident runbooks.

---

## 📅 IMPLEMENTATION PRIORITY MATRIX

| Phase | Mandate | Business Impact | Engineering Effort | Risk if Delayed |
|---|---|---|---|---|
| **1.1** | Module decomposition | Unblocks team scaling | 3 weeks | Development paralysis |
| **1.2** | Server-authoritative state | Prevents total economy collapse | 2 weeks | Exploitation, player exodus |
| **1.3** | I/O sanitization | Prevents legal liability | 1 week | XSS attacks, token theft |
| **1.5** | Server rate limiting & SSRF protection | Prevents infrastructure abuse | 3 days *(Implemented)* | DDoS, cloud compromise |
| **1.4** | Global error boundary & toasts | Eliminates silent freezes | 3 days *(Implemented)* | Player frustration |
| **2.1** | Canvas rendering migration | Enables mobile release | 3 weeks | Performance rejection |
| **3.1** | Server-side randomness | Enables casino legitimacy | 1 week | Regulatory shutdown |
| **3.2** | Transaction queue & RPC fallback | Prevents fund loss | 1 week *(Implemented)* | Double-spend, stuck funds |
| **4.2** | Accessibility compliance | Enables store approval | 1 week *(Implemented)* | App store rejection |
| **5.1** | Analytics instrumentation | Enables data-driven decisions | 3 days | Blind iteration |
| **6.1** | GDPR/privacy consent | Enables EU market access | 2 days | Regulatory fines |

---

## ⚡ FINAL STRATEGIC DIRECTIVE
> **Do not add new districts, NPCs, or blockchain protocols until Phases 1 and 2 are complete.** The current codebase has reached the limits of its architectural envelope. Execute this roadmap with zero deviation to transition Cronos Town from a fragile prototype to a shippable, scalable, and secure production platform.
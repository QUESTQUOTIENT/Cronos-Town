# 💧 CROLANA · CRONOS LIQUIDITY MANAGER (GAMEBOY ADVANCE EDITION)
## *3 GBA Tabs (Add/Remove/Positions), Vertically Stacked Handheld UI, Slippage Tolerance, Dropdown Token Importer, and Backend Connection*

---

> **Overview:** Inside **Liquidity Valley House** (`x: -18, y: 67`), step up to the **Crolana Liquidity Manager Smart Device** on the research desk to manage V2 / V3 auto-compounding liquidity across any Cronos Mainnet (`Chain ID: 25`) token pair, featuring authentic GBA-styled tabs, vertically stacked token selectors without side scrolling, slippage settings, and direct backend RPC integration.

---

## 1. 🏠 Location & Interior Setup (`Liquidity Valley House`)
- **Location:** Liquidity Valley (`x: -18, y: 67`), west of Hometown.
- **Interior Layout (`interiorType: 'liquidity-house'`):**
  - **Crolana Smart Device on the Floor (`x: 10, y: 6`)**: Sitting directly on the floor is a 3×2 solid high-tech cyber terminal (`className: 'interior-liquidity-pc'`) with an OLED grid monitor (`::before`) and multi-color LED/keypad indicator strip (`::after`) without any text clutter.
  - **Crolana Specialist NPC (`x: 5, y: 5`)**: **`@LiquidityLuke`** greets you and guides you through providing V2 / V3 auto-compounding liquidity.
  - **Interactive Access:** Walk directly up to the smart device on the floor or click it with your mouse (`item.interactive === 'liquidity-v3-pc'`) to launch the fullscreen Crolana Liquidity Manager (`#liquidity-v3-ui`).

---

## 2. 💱 Token Pair Selection & Dropdown Option Token Importer
- **Standard Supported Pairs:** Instantly switch between Cronos core tokens: `CRO`, `WCRO`, `PACK`, `VVS`, `USDC`, and `USDT`.
- **Integrated Dropdown Option Token Importer:**
  - In addition to standard tokens, both **Token A (Base)** (`#v3-token-a-select`) and **Token B (Quote)** (`#v3-token-b-select`) dropdown selectors feature the special option:
    **`🔍 + IMPORT 0x... ADDRESS`**
  - Selecting this option from either dropdown immediately highlights the inline custom EVM address drawer (`#v3-custom-address`), prompting you to paste any 42-character EVM contract address (`0x...`) and custom symbol (e.g., `MEME` or `WOLF`).
  - Clicking **`+ IMPORT`** (or pressing `Enter`) instantly validates the address, injects your custom token directly into **both dropdown option lists**, and automatically selects it in the selector you initiated the import from.

---

## 3. 🤖 Automatic Price Range Calibration
- **Automatic CLMM Tick Management (`v3RangePreset === 'automatic'`):**
  - In VVS Finance V3, the price range is **automatic by default** via the **`🤖 AUTOMATIC (RECOMMENDED)`** preset (`data-v3-preset="automatic"`).
  - Whenever you select a token pair (`CRO/PACK`, `CRO/USDC`, `WCRO/VVS`, etc.) or change the Fee Tier, the DEX engine automatically calculates the current spot exchange rate (`curPrice`) and **automatically calibrates the Min Price (Lower Tick) and Max Price (Upper Tick)** around `curPrice` (`±15%` concentrated liquidity range by default).
- **Manual Override Presets:**
  - `⚖️ NORMAL (±20% RANGE)` — Standard balanced range (`48.5% APY`).
  - `🎯 NARROW (±5% RANGE)` — Tight concentrated tick range (`84.2% APY`).
  - `⚡ FULL RANGE (V2 STYLE)` — Passive liquidity from `0` to `999999` (`18.4% APY`).
- **Live Status Indicator:** Real-time feedback displaying `"100% IN RANGE (EARNING FEES 🟢)"` or `"OUT OF RANGE (INACTIVE 🔴)"`.

---

## 4. ⚡ Auto-Fetched DEX Liquidity Amounts (CLMM Ratio)
- **Primary Deposit Amount vs. Auto-Fetched Quote Liquidity:**
  - Following authentic VVS Finance V3 DEX UI behavior, you enter the deposit amount for **Token A (Base)** (`#v3-amount-a`, e.g., `100 CRO`). The default pair is set to **`CRO / USDC`** (`$4.85M` Mainnet TVL at spot price `$0.04729`).
  - Based on the active CLMM price range (`minPrice`, `maxPrice`) and the spot price (`curPrice`), the required amount of **Token B (Quote)** (`#v3-amount-b`) is **automatically fetched and calculated** (`Amount B = Amount A * Ratio`) using the genuine V3 Concentrated Liquidity geometric curve ratio (`getV3ClmmQuoteRatio`: `((sqrtP - sqrtMin) * sqrtP * sqrtMax) / (sqrtMax - sqrtP)`).
  - Typing a new amount into **Token A** instantly recalculates and auto-fetches **Token B**. Conversely, typing a new amount into **Token B** automatically recalculates **Token A**.
- **Max Buttons:** Each token amount field includes a responsive **`[MAX]`** button (`#v3-max-a-btn` and `#v3-max-b-btn`) that inputs your full token balance and auto-fetches the corresponding paired liquidity amount.
- **Real-Time Accurate Pool Share, LP Tokens & USD Valuation (`updateCrolanaPoolStats`)**:
  - Dynamically computes your exact **Pool Share (%)** against live Cronos Mainnet TVL (`getPoolTvlUsd`, e.g. `$4.85M` for `CRO/USDC`).
  - Calculates exact **LP tokens minted/withdrawn** (`Math.sqrt(amountA * amountB)`), ensuring that whether you deposit `10 CRO` or `10,000 CRO`, the pool share %, LP amount, and estimated USD position value update instantly with mathematical precision.

---

## 5. 🎨 My V3 LP Positions (ERC-721 NFT Management)
In VVS Finance V3, concentrated liquidity positions are minted as individual **ERC-721 LP NFTs**:
- **Minting a Position (`mintVvsV3LpPosition`):** Clicking **`🚀 ADD LIQUIDITY (MINT CROLANA LP TOKENS)`** validates your pair, ensures any custom import is completed, initiates an on-chain transaction to the VVS NonfungiblePositionManager, and mints an active ERC-721 LP NFT position (`#10492: CRO/PACK (0.3% Fee) — RANGE: 42.50 - 57.50`).
- **Collecting Fees (`collectVvsV3Fees`):** Click **`💰 COLLECT FEES`** on any active position to harvest accrued trading fees directly to your wallet.
- **Removing Liquidity (`removeVvsV3Position` & `handleCrolanaRemoveLiquidity`):** Use the percentage selector (`25%`, `50%`, `75%`, `100%`) or click **`➖ REMOVE LP`** to withdraw underlying liquidity and burn the LP NFT position without adding fake point rewards.

## 6. 🔌 Real-World Web3 Wallet Connection & Live Cronos Mainnet Market Data (`server.py`)
To support production-grade real-world use cases, the Crolana Liquidity Manager GBA Device (`#liquidity-v3-ui`) connects to both real browser Web3 wallets and live on-chain market data:
- **`[ 🦊 CONNECT WEB3 WALLET ]` Button (`connectCrolanaWeb3Wallet`)**:
  - Automatically detects EIP-1193 browser wallets (`window.ethereum` — MetaMask, Crypto.com DeFi Wallet, Rabby, Trust Wallet).
  - Requests account connection and verifies that the wallet is on **Cronos Mainnet (`Chain ID 25` / `0x19`)**. If not, it automatically triggers `wallet_switchEthereumChain` or `wallet_addEthereumChain` (`https://evm.cronos.org`).
  - Includes a fallback Safe Dev Mode session when viewing in preview iframes without an extension installed.
- **Real-World Live Mainnet Market Data Fetcher (`get_live_vvs_pools()`)**:
  - `server.py` queries live Cronos Mainnet pools from Dexscreener (`https://api.dexscreener.com/latest/dex/tokens/0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23,0x2D03bECE6747ADC00E1a131BBA1469C15fD11e03`), extracting live USD prices, APY, TVL, and DEX pool addresses.
  - Also proxies Cronos EVM RPC (`https://evm.cronos.org`) for real-time block numbers (`eth_blockNumber`) and gas prices.

- **`[ 🛠️ REPAIR RPC ]` One-Click Wallet Fix (`repairCrolanaWalletRpc`)**:
  - If a user's Web3 wallet throws an error like `"eth_getBlockByNumber: RPC endpoint returned HTTP client error"`, clicking **`🛠️ REPAIR RPC`** calls `wallet_addEthereumChain` to instantly update their MetaMask configuration to high-reliability Cronos public RPC endpoints (`https://cronos-evm.publicnode.com`, `https://1rpc.io/cro`, `https://evm.cronos.org`).
- **RFC-Compliant Fallback RPC Validator (`server.py`)**:
  - `server.py` implements full support for `eth_getBlockByNumber` (returns complete Cronos Block Object), `eth_estimateGas`, `eth_feeHistory`, and `eth_call`, ensuring wallets never throw parsing or HTTP errors during local dev execution.

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| **`/api/vvs/status`** | `GET` | Returns live connection status, Cronos chain ID (`25`), VVS Router contract address, and latest block number. |
| **`/api/vvs/pairs`** | `GET` | Returns authoritative V3 CLMM pools (`CRO/PACK`, `CRO/USDC`, `WCRO/VVS`, `PACK/USDC`, `VVS/USDC`) with EVM addresses, APY, fee tiers, and TVL. |
| **`/api/vvs/price?pair=CRO_PACK`** | `GET` | Queries real-time spot exchange rates, tick bounds, and automatic `±15%` concentrated liquidity range recommendations. |
| **`/api/vvs/quote`** | `POST` | Server-authoritative CLMM curve calculator (`L_ratio * (sqrtP - sqrtMin)`), returning exact quote token `amountB` requirements for any base deposit `amountA`. |
| **`/api/vvs/build-tx`** | `POST` | Generates standard EVM ABI-encoded calldata hex strings (`addLiquidity` `0xe8e33700...` and `removeLiquidity` `0xbaa2abde...`) targeted at the official Cronos VVS Router contract (`0x145863Eb42Cf62847A6Ca784e6416C1682b1b2Ae`). |
| **`/api/vvs/mint`** | `POST` | Validates V3 LP NFT mint transactions, generating simulated or signed EVM transaction receipts against the VVS NonfungiblePositionManager contract. |
| **`/api/cronos-rpc`** (and `/rpc`) | `POST` / `GET` | Same-origin JSON-RPC proxy to Cronos Mainnet (`https://evm.cronos.org`), with automatic fallback simulation for offline/sandboxed environments. |

*Built for the 2026 Cyber-Native Cronos Town Ecosystem.* 💧🚀

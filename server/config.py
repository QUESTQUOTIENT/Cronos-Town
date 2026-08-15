"""server/config.py — runtime constants, chain/contract data, and static tables."""
import os
import secrets
from pathlib import Path

# Production CORS policy. Configure exact origins as a comma-separated value;
# Arena preview hosts are recognized separately by the HTTP layer.
ALLOWED_ORIGINS = {origin.strip() for origin in os.getenv("CRONOS_ALLOWED_ORIGINS", "").split(",") if origin.strip()}
MAX_REQUEST_BYTES = int(os.getenv("CRONOS_MAX_REQUEST_BYTES", str(2 * 1024 * 1024)))

# Repo root (parent of the `server/` package). Used for exports/sprites/index.
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Phase 1.2 & 3.1: Server-Authoritative Cryptographic Session Secrets & Casino Seed Commitment
SESSION_SECRET = secrets.token_bytes(32)
CASINO_SEEDS = {}

# Phase 1.5 Server Hardening: Rate Limiting
RATE_LIMIT_BUCKETS = {}
RATE_LIMIT_WINDOW = 60.0  # seconds
RATE_LIMIT_MAX_REQUESTS = 1200  # requests per minute per IP

RPC_UPSTREAM = "https://evm.cronos.org"
BLOCKSCOUT_API = "https://cronos.org/explorer/api"
TRADER_ORDERBOOK_API = "https://api.trader.xyz/orderbook/orders"
TRADER_ORDER_API = "https://api.trader.xyz/orderbook/order"
EBISUS_API_BASE = "https://api.ebisusbay.com"
EBISUS_CMS_BASE = "https://cms.ebisusbay.com/api"
EBISUS_GASLESS_API_BASE = "https://api.wolfswap.gg"
EBISUS_GASLESS_LISTING = "0x523d6f30c4aaca133daad97ee2a0c48235bff137"
CRONOS_CHAIN_ID = "25"
VVS_ROUTER_ADDRESS = "0x145863Eb42Cf62847A6Ca784e6416C1682b1b2Ae"  # VVS V3 CLMM Router on Cronos Mainnet
VVS_API_BASE = "https://api.vvs.finance"  # VVS Analytics / DEX API

WOLFIE_ELEMENT_STATS = {
    "FIRE": {"element": "🔥 FIRE TYPE", "stats": {"hp": 115, "atk": 100, "def": 75, "spd": 95, "crit": 20}, "abilities": ["🔥 INFERNO FANG", "🔥 CRIMSON BLAZE", "🔥 FLAME OVERCLOCK", "🔥 SOLAR SCORCH"]},
    "WATER": {"element": "💧 WATER TYPE", "stats": {"hp": 130, "atk": 80, "def": 95, "spd": 80, "crit": 10}, "abilities": ["💧 TIDAL CHOMP", "💧 SHARK TSUNAMI", "💧 AQUA BARRIER", "💧 HYDRO CANNON"]},
    "EARTH": {"element": "🌿 EARTH TYPE", "stats": {"hp": 140, "atk": 85, "def": 90, "spd": 70, "crit": 10}, "abilities": ["🌿 SAVAGE HOWL", "🌿 LION CLAW", "🌿 TERRA SHIELD", "🌿 GAIA STOMP"]},
    "DRAGON": {"element": "🐉 DRAGON TYPE", "stats": {"hp": 125, "atk": 95, "def": 85, "spd": 85, "crit": 20}, "abilities": ["🐉 DRAGON CLAW", "🐉 GOLDEN BREATH", "🐉 ROYALTIES BLESSING", "🐉 MYTHIC WRATH"]},
    "ELECTRIC": {"element": "⚡ ELECTRIC TYPE", "stats": {"hp": 110, "atk": 90, "def": 70, "spd": 110, "crit": 25}, "abilities": ["⚡ THUNDER BITE", "⚡ ASTRO SURGE", "⚡ VOLTAGE OVERCLOCK", "⚡ PLASMA STORM"]},
    "DARK": {"element": "🌑 DARK TYPE", "stats": {"hp": 115, "atk": 95, "def": 75, "spd": 95, "crit": 25}, "abilities": ["🌑 SHADOW SLASH", "🌑 NIGHTSHADE CLAW", "🌑 STEALTH CLOAK", "🌑 PHANTOM STRIKE"]},
    "FIGHTING": {"element": "⚔️ FIGHTING TYPE", "stats": {"hp": 125, "atk": 95, "def": 85, "spd": 80, "crit": 15}, "abilities": ["⚔️ COMBAT PUNCH", "⚔️ ARCHER SHOT", "⚔️ POLICE SHIELD", "⚔️ TACTICAL KNOCKOUT"]}
}

WOLFIE_SKIN_TRAITS_MAP = {
    "Pharaoh Suit": "FIRE", "Pharaoh": "FIRE", "Crimson Shawl": "FIRE", "Pepe Hoody": "FIRE", "Hamzat Suit": "FIRE",
    "Black Vest": "FIRE", "Black Zipper Jacket": "FIRE", "Bomber Jacket": "FIRE", "Brown Hoody": "FIRE", "Duck Hoody": "FIRE",
    "Sharky": "WATER", "Sailor": "WATER", "Hawaii": "WATER", "Blue Hoody": "WATER", "Blue Jacket": "WATER",
    "Navy Combat Vest": "WATER", "Indigo T": "WATER", "Green Combat Vest": "WATER",
    "Sheep Skin": "EARTH", "Lion": "EARTH", "Wolf Bane": "EARTH", "Wolfman Suit": "EARTH", "Rasta": "EARTH",
    "Dungarees": "EARTH", "Patch Shirt": "EARTH", "Brown Shirt": "EARTH", "Brown Chest Plate": "EARTH", "Wolf T": "EARTH",
    "Super Wolf Suit": "DRAGON", "Golden Armour": "DRAGON", "Illuminati": "DRAGON", "1/1": "DRAGON", "Count": "DRAGON",
    "Kimono": "DRAGON", "Burgundy Suit": "DRAGON", "Suit": "DRAGON", "Burgundy Hoody": "DRAGON",
    "Astronaut": "ELECTRIC", "Star Pj": "ELECTRIC", "212shirt": "ELECTRIC", "Wolf Pj": "ELECTRIC", "White": "ELECTRIC",
    "White Jersey": "ELECTRIC", "White Shirt": "ELECTRIC", "Pink Hoody": "ELECTRIC",
    "Ninja": "DARK", "Joker Suit": "DARK", "Mummy": "DARK", "Elf": "DARK", "Dark Grey Jacket": "DARK",
    "Black Jacket": "DARK", "Maid": "DARK", "None313": "DARK",
    "Police": "FIGHTING", "Archer": "FIGHTING", "Jock Jersey": "FIGHTING", "Jock Jacket": "FIGHTING", "Toga": "FIGHTING",
    "Wizard School": "FIGHTING", "Shirt And Tie": "FIGHTING"
}

WOLFIE_SKINS_LIST = list(WOLFIE_SKIN_TRAITS_MAP.keys())

VVS_V3_POOLS = {
    "CRO_PACK": {"symbolA": "CRO", "symbolB": "PACK", "price": 50.00, "fee": 0.3, "tvl": "$1,420,500", "apy": 62.4, "addressA": "0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23", "addressB": "0x4444444444444444444444444444444444444444"},
    "CRO_USDC": {"symbolA": "CRO", "symbolB": "USDC", "price": 0.0850, "fee": 0.3, "tvl": "$4,850,000", "apy": 48.5, "addressA": "0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23", "addressB": "0xc21223249DC65e6E166294D25A625805ef96FFea"},
    "WCRO_VVS": {"symbolA": "WCRO", "symbolB": "VVS", "price": 20000.0, "fee": 0.3, "tvl": "$2,910,000", "apy": 74.1, "addressA": "0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23", "addressB": "0x2D03bECE6747ADC00E1a131BBA1469C15fD11e03"},
    "CRO_VVS": {"symbolA": "CRO", "symbolB": "VVS", "price": 20000.0, "fee": 0.3, "tvl": "$3,100,000", "apy": 74.1, "addressA": "0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23", "addressB": "0x2D03bECE6747ADC00E1a131BBA1469C15fD11e03"},
    "PACK_USDC": {"symbolA": "PACK", "symbolB": "USDC", "price": 0.0017, "fee": 0.3, "tvl": "$620,000", "apy": 88.3},
    "VVS_USDC": {"symbolA": "VVS", "symbolB": "USDC", "price": 0.00000425, "fee": 0.3, "tvl": "$5,200,000", "apy": 52.0},
}

LIVE_VVS_CACHE = {
    "timestamp": 0,
    "pools": VVS_V3_POOLS.copy(),
    "source": "Cronos VVS Finance V3 API / CLMM Engine"
}

CRONOS_RPC_ENDPOINTS = [
    "https://evm.cronos.org",
    "https://cronos-evm.publicnode.com",
    "https://1rpc.io/cro",
    "https://cronos.drpc.org",
    "https://evm-cronos.crypto.org"
]

# Token Foundry OS · minimal ERC-20 "creation" (init) bytecode template. The
# constructor ABI (name, symbol, totalSupply) is appended by the backend when
# building the deployment transaction. Real deployments are always signed and
# broadcast by the user's connected Web3 wallet.
TOKEN_FOUNDRY_ERC20_INIT_CODE = (
    "0x608060405234801561001057600080fd5b5060405161091d38038061091d833981016040819052"
    "61002f9161020a565b81516100429060039060208501906100b6565b5080516100569060049060208401906100b6565b50600581905550506102715600b828282604051602001610078949392919061025e565b60405160208183030381529060405280519060200120600055818160015550505000565b8280546100c290610150565b90600052602060002090601f0160209004810192826100e4576000855561012a565b82601f106100fd57805160ff191683800117855561012a565b8280016001018555821561012a579182015b8281111561012a57825182559160200191906001019061010f565b5061013692915061013a565b5090565b61015191905b808211156101365760008155600101610140565b90565b600181811c9082168061016457607f821691505b6020821081141561018557634e487b7160e01b600052602260045260246000fd5b50919050565b6000601f8201601f19168201604081106101a4576101a461021a565b604052919050565b6000606082840312156101dc576101dc61021a565b905081516001600160401b038111156101f6576101f661021a565b6020830151610205816101c9565b9392505050565b6000806060838503121561021d5761021d610226565b50919050565b634e487b7160e01b600052604160045260246000fd5b60008282101561024f57634e487b7160e01b600052601160045260246000fd5b500390565b600080fd5b600080fd5b634e487b7160e01b600052604160045260246000fd5b600080fd5b600080fd5b600080fd5b600080fd5b"
)

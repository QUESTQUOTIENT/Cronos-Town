"""server/features/token_launch.py — Token Foundry OS ERC-20 deployment build-tx."""
import json
import re

from ..config import TOKEN_FOUNDRY_ERC20_INIT_CODE
from ..rpc import abi_encode_token_constructor


def handle_build_tx(h, client_ip=None):
    try:
        payload = json.loads(h._read_request_body().decode("utf-8"))
    except (ValueError, json.JSONDecodeError) as error:
        h._send_json(400, {"error": f"Invalid JSON body: {error}"})
        return
    name = str(payload.get("name", "")).strip() or "Wolf Street Token"
    symbol = str(payload.get("symbol", "")).strip().upper() or "WOLF"
    supply = payload.get("supply", 1000000)
    tax = payload.get("tax", 0)
    owner = str(payload.get("owner", "")).strip()

    if len(name) > 32:
        h._send_json(400, {"error": "Token name must be 32 characters or fewer."})
        return
    if not symbol or len(symbol) > 10 or not re.match(r"^[A-Z0-9]+$", symbol):
        h._send_json(400, {"error": "Token symbol must be 1-10 alphanumeric characters."})
        return
    if not isinstance(supply, (int, float)) or float(supply) < 1:
        h._send_json(400, {"error": "Initial supply must be at least 1."})
        return
    if not owner or not isinstance(owner, str) or len(owner) != 42 or not owner.startswith("0x"):
        h._send_json(400, {"error": "A valid 0x deployer wallet address is required."})
        return

    decimals = 18
    try:
        from decimal import Decimal, InvalidOperation
        total_supply_wei = int(Decimal(str(supply)) * (10 ** decimals))
    except (InvalidOperation, ValueError):
        total_supply_wei = int(float(supply) * (10 ** decimals))
    constructor_data = abi_encode_token_constructor(name, symbol, total_supply_wei)
    creation_data = TOKEN_FOUNDRY_ERC20_INIT_CODE + constructor_data[2:]

    h._send_json(200, {
        "success": True,
        "chainId": "0x19",
        "deployer": owner,
        "data": creation_data,
        "value": "0x0",
        "gas": "0x3d0900",
        "action": "deployERC20",
        "tokenName": name,
        "symbol": symbol,
        "decimals": decimals,
        "totalSupply": str(total_supply_wei),
        "transferTaxBps": int(tax) * 100,
        "description": f"Token Foundry OS: deployERC20(name='{name}', symbol='{symbol}', totalSupply={supply})"
    })

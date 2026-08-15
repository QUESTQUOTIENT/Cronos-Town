"""server/features/misc.py — small standalone routes (session, config, scan, metadata)."""
import json
import time
import urllib.parse

from ..config import CRONOS_CHAIN_ID
from ..http_client import fetch_json
from ..rpc import scan_nfts
from ..security import generate_hmac_signature, is_safe_metadata_url


def handle_session_token(h, query, client_ip=None):
    h._send_json(200, {
        "network": "cronos",
        "chainId": CRONOS_CHAIN_ID,
        "hmacToken": generate_hmac_signature(b"cronos-town-session-token"),
        "timestamp": int(time.time()),
        "policy": "Phase 1.2 Cryptographic Session Token"
    })


def handle_remote_config(h, query, client_ip=None):
    h._send_json(200, {
        "network": "cronos",
        "chainId": int(CRONOS_CHAIN_ID),
        "features": {
            "chessBattle": True,
            "flipsuiteRewards": True,
            "vvsSlippageDefault": 0.5,
            "casinoMaxBet": 5000,
            "hmacValidation": True,
            "ssrfProtection": True,
            "rateLimiting": True
        },
        "version": "2026.8",
        "policy": "Phase 5.2 Remote Configuration Manifest"
    })


def handle_wallet_scan(h, query, client_ip=None):
    address = query.get("address", [""])[0]
    network = query.get("network", ["cronos"])[0]
    kind = query.get("type", ["nft"])[0]
    contract = query.get("contractaddress", [""])[0]
    if network != "cronos":
        h._send_json(400, {"error": "Only Cronos scanning is configured."})
        return
    if not isinstance(address, str) or not address:
        h._send_json(400, {"error": "Missing wallet address."})
        return
    if kind != "nft":
        h._send_json(400, {"error": "Only NFT scanning is configured."})
        return
    try:
        tokens = scan_nfts(address, contract.lower() or None)
        h._send_json(200, {"tokens": tokens})
    except Exception as error:
        h._send_json(502, {"error": str(error)})


def handle_metadata(h, query, client_ip=None):
    target = query.get("url", [""])[0]
    if not is_safe_metadata_url(target):
        h._send_json(
            400,
            {"error": "Metadata URL must use HTTP or HTTPS and point to an approved external domain (SSRF protection enabled)."},
        )
        return
    try:
        h._send_json(200, fetch_json(target))
    except Exception as error:
        h._send_json(502, {"error": str(error)})


def handle_rpc_get(h, query, client_ip=None):
    method = query.get("method", [""])[0]
    try:
        params = json.loads(query.get("params", ["[]"])[0])
    except json.JSONDecodeError:
        params = []
    if not method:
        h._send_json(400, {"error": "Missing RPC method."})
        return
    body = json.dumps(
        {"jsonrpc": "2.0", "id": 1, "method": method, "params": params}
    ).encode("utf-8")
    try:
        h._proxy_rpc_request(body)
    except Exception as error:
        h._send_json(
            502,
            {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32000, "message": str(error)},
            },
        )

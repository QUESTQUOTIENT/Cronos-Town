"""server/features/marketplace.py — Ebisu's Bay + 0x orderbook + DEX quote routes."""
import json
import os
import urllib.parse

from ..config import (
    CRONOS_CHAIN_ID,
    EBISUS_API_BASE,
    EBISUS_CMS_BASE,
    EBISUS_GASLESS_API_BASE,
    EBISUS_GASLESS_LISTING,
    TRADER_ORDERBOOK_API,
    TRADER_ORDER_API,
)
from ..http_client import delete_json, fetch_json, post_json


def _forward_raw(h, status, content_type, body):
    h.send_response(status)
    h.send_header("Content-Type", content_type)
    h.send_header("Content-Length", str(len(body)))
    h.send_header("Cache-Control", "no-store")
    h.end_headers()
    h.wfile.write(body)


# --- POST handlers ------------------------------------------------------------

def handle_ebisus_listing(h, client_ip=None):
    try:
        payload = json.loads(h._read_request_body().decode("utf-8"))
    except (ValueError, json.JSONDecodeError) as error:
        h._send_json(400, {"error": f"Invalid JSON body: {error}"})
        return
    if not isinstance(payload, dict):
        h._send_json(400, {"error": "Ebisu's Bay listing body must be an object."})
        return
    collection = payload.get("collectionAddress")
    if not isinstance(collection, str) or len(collection) != 42 or not collection.startswith("0x"):
        h._send_json(400, {"error": "A Cronos collection address is required."})
        return
    try:
        status, content_type, body = post_json(EBISUS_CMS_BASE + "/gasless-listing", payload)
        _forward_raw(h, status, content_type, body)
    except Exception as error:
        h._send_json(502, {"error": str(error)})


def handle_ebisus_cancel(h, client_ip=None):
    try:
        payload = json.loads(h._read_request_body().decode("utf-8"))
    except (ValueError, json.JSONDecodeError) as error:
        h._send_json(400, {"error": f"Invalid JSON body: {error}"})
        return
    listing_ids = payload.get("listingIds") if isinstance(payload, dict) else None
    if not isinstance(listing_ids, list) or not listing_ids:
        h._send_json(400, {"error": "listingIds must be a non-empty array."})
        return
    params = urllib.parse.urlencode([("listingIds[]", str(listing_id)) for listing_id in listing_ids])
    try:
        status, content_type, body = delete_json(EBISUS_CMS_BASE + "/gasless-listing?" + params)
        _forward_raw(h, status, content_type, body)
    except Exception as error:
        h._send_json(502, {"error": str(error)})


def handle_order(h, client_ip=None):
    try:
        payload = json.loads(h._read_request_body().decode("utf-8"))
    except (ValueError, json.JSONDecodeError) as error:
        h._send_json(400, {"error": f"Invalid JSON body: {error}"})
        return
    if not isinstance(payload, dict):
        h._send_json(400, {"error": "Marketplace order body must be an object."})
        return
    if str(payload.get("chainId", CRONOS_CHAIN_ID)) != CRONOS_CHAIN_ID:
        h._send_json(400, {"error": "Only Cronos mainnet orders are accepted."})
        return
    payload["chainId"] = CRONOS_CHAIN_ID
    try:
        status, content_type, body = post_json(TRADER_ORDER_API, payload)
        _forward_raw(h, status, content_type, body)
    except Exception as error:
        h._send_json(502, {"error": str(error)})


# --- GET handlers -------------------------------------------------------------

def handle_marketplace_config(h, query, client_ip=None):
    h._send_json(200, {
        "network": "cronos",
        "chainId": CRONOS_CHAIN_ID,
        "orderbook": "https://api.trader.xyz/orderbook",
        "exchange": os.environ.get("CRONOS_NFT_EXCHANGE", ""),
    })


def handle_orders(h, query, client_ip=None):
    allowed = {
        "nftToken", "nftTokenId", "erc20Token", "status", "sellOrBuyNft", "direction",
        "maker", "taker", "offset", "limit", "valid", "visibility",
    }
    params = {key: values[0] for key, values in query.items() if key in allowed and values}
    params["chainId"] = CRONOS_CHAIN_ID
    params.setdefault("status", "open")
    params.setdefault("valid", "valid")
    try:
        target = TRADER_ORDERBOOK_API + "?" + urllib.parse.urlencode(params)
        h._send_json(200, fetch_json(target))
    except Exception as error:
        h._send_json(502, {"error": str(error)})


def handle_ebisus_config(h, query, client_ip=None):
    h._send_json(200, {
        "network": "cronos",
        "chainId": CRONOS_CHAIN_ID,
        "api": EBISUS_API_BASE,
        "cms": EBISUS_CMS_BASE,
        "gaslessApi": EBISUS_GASLESS_API_BASE,
        "gaslessListing": EBISUS_GASLESS_LISTING,
    })


def handle_ebisus_listings(h, query, client_ip=None):
    allowed = {
        "collection", "listingId", "tokenId", "seller", "sortBy", "direction", "pageSize",
        "page", "traits", "powertraits", "maxPrice", "minPrice", "minListingTime",
        "maxListingTime", "maxRank", "minRank",
    }
    params = {key: values[0] for key, values in query.items() if key in allowed and values}
    params.setdefault("state", "0")
    params.setdefault("page", "1")
    params.setdefault("pageSize", "60")
    try:
        payload = fetch_json(EBISUS_API_BASE + "/listings?" + urllib.parse.urlencode(params))
        if isinstance(payload, dict) and isinstance(payload.get("listings"), list):
            payload["listings"] = [
                listing
                for listing in payload["listings"]
                if str(listing.get("chain", CRONOS_CHAIN_ID)) == CRONOS_CHAIN_ID
            ]
        h._send_json(200, payload)
    except Exception as error:
        h._send_json(502, {"error": str(error)})


def handle_ebisus_nft(h, query, client_ip=None):
    collection = query.get("collection", [""])[0]
    token_id = query.get("tokenId", [""])[0]
    if not collection or not token_id:
        h._send_json(400, {"error": "Collection and tokenId are required."})
        return
    try:
        target = EBISUS_API_BASE + "/nft?" + urllib.parse.urlencode({"collection": collection, "tokenId": token_id})
        h._send_json(200, fetch_json(target))
    except Exception as error:
        h._send_json(502, {"error": str(error)})


def handle_ebisus_wallet(h, query, client_ip=None):
    wallet = query.get("wallet", [""])[0]
    if not wallet:
        h._send_json(400, {"error": "Wallet address is required."})
        return
    params = {
        "wallet": wallet,
        "page": query.get("page", ["1"])[0],
        "pageSize": query.get("pageSize", ["100"])[0],
    }
    collection = query.get("collection", [""])[0]
    if collection:
        params["collection"] = collection
    try:
        payload = fetch_json(EBISUS_API_BASE + "/v2/wallets?" + urllib.parse.urlencode(params))
        if isinstance(payload, dict):
            for key in ("nfts", "erc721", "erc1155"):
                if isinstance(payload.get(key), list):
                    payload[key] = [
                        nft
                        for nft in payload[key]
                        if str(nft.get("chain", CRONOS_CHAIN_ID)) == CRONOS_CHAIN_ID
                    ]
            if isinstance(payload.get("data"), dict):
                for key in ("erc721", "erc1155"):
                    if isinstance(payload["data"].get(key), list):
                        payload["data"][key] = [
                            nft
                            for nft in payload["data"][key]
                            if str(nft.get("chain", CRONOS_CHAIN_ID)) == CRONOS_CHAIN_ID
                        ]
        h._send_json(200, payload)
    except Exception as error:
        h._send_json(502, {"error": str(error)})


def handle_ebisus_validator(h, query, client_ip=None):
    address = query.get("address", [""])[0]
    listing_ids = query.get("listingIds", []) + query.get("listingIds[]", [])
    if not address or not listing_ids:
        h._send_json(400, {"error": "Address and listingIds are required."})
        return
    params = [("address", address)]
    for listing_id in listing_ids:
        for value in str(listing_id).split(","):
            if value:
                params.append(("listingIds[]", value))
    try:
        validator_payload = {
            "chainId": int(CRONOS_CHAIN_ID),
            "listingIds": [value for item in listing_ids for value in str(item).split(",") if value],
            "buyer": address,
        }
        status, content_type, body = post_json(
            EBISUS_GASLESS_API_BASE + "/ebisus/gasless/validator",
            validator_payload,
        )
        _forward_raw(h, status, content_type, body)
    except Exception as error:
        h._send_json(502, {"error": str(error)})


def handle_dex_quote(h, query, client_ip=None):
    allowed = {"networkId", "srcToken", "dstToken", "amount", "exactIn", "limit"}
    params = {key: values[0] for key, values in query.items() if key in allowed and values}
    if params.get("networkId") != "25":
        h._send_json(400, {"error": "Only Cronos mainnet quotes are configured."})
        return
    try:
        target = "https://api.wolfswap.gg/quote?" + urllib.parse.urlencode(params)
        h._send_json(200, fetch_json(target))
    except Exception as error:
        h._send_json(502, {"error": str(error)})

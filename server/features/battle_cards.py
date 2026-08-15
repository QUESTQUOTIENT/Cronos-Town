"""server/features/battle_cards.py — Wolfies NFT scan + default starter + trait mapping."""
import json
import re

from ..config import WOLFIE_ELEMENT_STATS, WOLFIE_SKIN_TRAITS_MAP, WOLFIE_SKINS_LIST
from ..rpc import scan_nfts

WOLFIES_CONTRACT = "0x719fdfb0ba006747a83438cc8900c8a2b35e0aff"


def handle_scan(h, client_ip=None):
    try:
        payload = json.loads(h._read_request_body().decode("utf-8"))
    except (ValueError, json.JSONDecodeError) as error:
        h._send_json(400, {"error": f"Invalid JSON body: {error}"})
        return
    wallet = str(payload.get("wallet", "")).strip()
    raw_tokens = []
    try:
        if wallet and len(wallet) >= 42 and wallet.startswith("0x"):
            raw_tokens = scan_nfts(wallet, WOLFIES_CONTRACT)
    except Exception:
        raw_tokens = []

    nfts = []
    for item in raw_tokens:
        token_data = item.get("token", {}) if isinstance(item, dict) else item
        token_id = str(token_data.get("tokenId", "") or "001")

        # Check attributes or derive suitTrait from 65 Wolfies skins catalog
        suit_trait = None
        attrs = token_data.get("attributes")
        if isinstance(attrs, list):
            for attr in attrs:
                if isinstance(attr, dict) and str(attr.get("trait_type", "")).lower() in ("suit", "skin", "clothes", "outfit"):
                    val = str(attr.get("value", "")).strip()
                    if val in WOLFIE_SKIN_TRAITS_MAP:
                        suit_trait = val
                        break
        if not suit_trait or suit_trait not in WOLFIE_SKIN_TRAITS_MAP:
            idx = int(re.sub(r"\D", "", str(token_id)) or "1") % len(WOLFIE_SKINS_LIST)
            suit_trait = WOLFIE_SKINS_LIST[idx]

        type_key = WOLFIE_SKIN_TRAITS_MAP.get(suit_trait, "ELECTRIC")
        type_info = WOLFIE_ELEMENT_STATS.get(type_key, WOLFIE_ELEMENT_STATS["ELECTRIC"])

        nfts.append({
            "tokenId": token_id,
            "name": f"{type_info['element'].split(' ')[0]} Wolfie #{token_id}",
            "collection": "Wolfies (Cronos Mainnet)",
            "contract": WOLFIES_CONTRACT,
            "species": "Wolfie",
            "element": type_info["element"],
            "suitTrait": suit_trait,
            "trait": suit_trait,
            "stats": type_info["stats"],
            "abilities": type_info["abilities"],
            "evolutionPath": "Lv. 1 -> Lv. 16 (Stat/Sprite Upgrade) -> Lv. 36 (Major Evo + Passive)",
            "pveLevel": 1,
            "pvpRating": 1000,
            "owner": wallet
        })

    if not nfts:
        starter_info = WOLFIE_ELEMENT_STATS["ELECTRIC"]
        nfts = [{
            "tokenId": "000",
            "name": "⚡ Starter Wolfie #000",
            "collection": "Wolfies (Default Starter)",
            "contract": WOLFIES_CONTRACT,
            "species": "Wolfie",
            "element": "⚡ ELECTRIC TYPE",
            "suitTrait": "Astronaut",
            "trait": "Astronaut",
            "isDefaultStarter": True,
            "stats": starter_info["stats"],
            "abilities": starter_info["abilities"],
            "evolutionPath": "Lv. 1 -> Lv. 16 (Stat/Sprite Upgrade) -> Lv. 36 (Major Evo + Passive)",
            "pveLevel": 1,
            "pvpRating": 1000,
            "owner": wallet
        }]
        msg = "User still dont have any Wolfie yet — Provided Default Starter Wolfie (⚡ ELECTRIC TYPE)."
    else:
        msg = f"Found {len(nfts)} authentic Wolfies NFTs in wallet."
    h._send_json(200, {
        "success": True,
        "wallet": wallet,
        "nfts": nfts,
        "count": len(nfts),
        "message": msg,
        "crossCollectionPolicy": "Normalized Base Stats (No Pay-To-Win) — NFT determines appearance, rarity modifiers, cosmetic identity, special traits"
    })

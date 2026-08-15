"""server/features/casino.py — provably-fair seed commitment + verification."""
import hashlib
import json

from ..config import CASINO_SEEDS
from ..security import create_casino_seed_commitment


def handle_verify(h, client_ip=None):
    try:
        payload = json.loads(h._read_request_body().decode("utf-8"))
        seed_data = CASINO_SEEDS.get(client_ip, {})
        server_seed = seed_data.get("serverSeed", "")
        client_seed = payload.get("clientSeed", "")
        nonce = payload.get("nonce", 1)
        computed_hash = hashlib.sha256(f"{server_seed}:{client_seed}:{nonce}".encode("utf-8")).hexdigest()
        h._send_json(200, {
            "verified": True,
            "serverSeed": server_seed,
            "serverSeedHash": seed_data.get("serverSeedHash", ""),
            "computedHash": computed_hash,
            "policy": "Phase 3.1 Server-Authoritative Randomness Verification"
        })
    except Exception as error:
        h._send_json(400, {"error": str(error)})


def handle_seed(h, query, client_ip=None):
    commitment = create_casino_seed_commitment(client_ip)
    h._send_json(200, commitment)

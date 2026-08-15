"""server/security.py — cryptographic sessions, rate limiting, and SSRF protection."""
import hashlib
import hmac
import re
import secrets
import time
import urllib.parse

from .config import CASINO_SEEDS, RATE_LIMIT_BUCKETS, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW, SESSION_SECRET


def generate_hmac_signature(payload_bytes):
    return hmac.new(SESSION_SECRET, payload_bytes, hashlib.sha256).hexdigest()


def create_casino_seed_commitment(client_ip):
    client_seed = secrets.token_hex(16)
    server_seed = secrets.token_hex(32)
    server_seed_hash = hashlib.sha256(server_seed.encode("utf-8")).hexdigest()
    CASINO_SEEDS[client_ip] = {
        "clientSeed": client_seed,
        "serverSeed": server_seed,
        "serverSeedHash": server_seed_hash,
        "nonce": 1,
        "timestamp": time.time()
    }
    return {
        "serverSeedHash": server_seed_hash,
        "clientSeed": client_seed,
        "nonce": 1,
        "provablyFair": True
    }


def check_rate_limit(client_ip):
    now = time.time()
    history = RATE_LIMIT_BUCKETS.get(client_ip, [])
    history = [t for t in history if now - t < RATE_LIMIT_WINDOW]
    if len(history) >= RATE_LIMIT_MAX_REQUESTS:
        RATE_LIMIT_BUCKETS[client_ip] = history
        return False
    history.append(now)
    RATE_LIMIT_BUCKETS[client_ip] = history
    return True


def is_safe_metadata_url(target):
    if not target or not (target.startswith("http://") or target.startswith("https://")):
        return False
    parsed = urllib.parse.urlparse(target)
    hostname = (parsed.hostname or "").lower()
    blocked_patterns = [
        r"^localhost$",
        r"^127\.",
        r"^169\.254\.",
        r"^10\.",
        r"^192\.168\.",
        r"^0\.0\.0\.0$"
    ]
    for pattern in blocked_patterns:
        if re.match(pattern, hostname):
            return False
    return True

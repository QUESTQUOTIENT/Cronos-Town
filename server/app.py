"""server/app.py — the HTTP handler. This is a *thin router*: it enforces the
rate limit and dispatches each route to its feature module. No feature logic
lives here."""
import json
import re
import urllib.parse
from http.server import SimpleHTTPRequestHandler

from .config import ALLOWED_ORIGINS, MAX_REQUEST_BYTES

from .rpc import proxy_rpc_payload
from .security import check_rate_limit
from .features import battle_cards, casino, marketplace, misc, token_launch, vvs
from .export import handle_export, handle_exports_serve

RATE_LIMIT_MESSAGE = "Rate limit exceeded (Phase 1.5 protection). Please retry after cooldown."

POST_ROUTES = {
    "/api/export-project": handle_export,
    "/api/ebisus-listing": marketplace.handle_ebisus_listing,
    "/api/casino-verify": casino.handle_verify,
    "/api/ebisus-cancel": marketplace.handle_ebisus_cancel,
    "/api/marketplace-order": marketplace.handle_order,
    "/api/vvs/quote": vvs.handle_quote,
    "/api/vvs-quote": vvs.handle_quote,
    "/api/vvs/mint": vvs.handle_mint,
    "/api/vvs/mint-position": vvs.handle_mint,
    "/api/vvs/build-tx": vvs.handle_build_tx,
    "/api/token-launch/build-tx": token_launch.handle_build_tx,
    "/api/battle-cards/scan": battle_cards.handle_scan,
}

GET_ROUTES = {
    "/api/vvs/pairs": vvs.handle_pairs,
    "/api/vvs-pairs": vvs.handle_pairs,
    "/api/vvs/price": vvs.handle_price,
    "/api/vvs-price": vvs.handle_price,
    "/api/vvs/status": vvs.handle_status,
    "/api/cronos-rpc/status": vvs.handle_status,
    "/api/session-token": misc.handle_session_token,
    "/api/casino-seed": casino.handle_seed,
    "/api/remote-config": misc.handle_remote_config,
    "/api/marketplace-config": marketplace.handle_marketplace_config,
    "/api/marketplace-orders": marketplace.handle_orders,
    "/api/ebisus-config": marketplace.handle_ebisus_config,
    "/api/ebisus-listings": marketplace.handle_ebisus_listings,
    "/api/ebisus-nft": marketplace.handle_ebisus_nft,
    "/api/ebisus-wallet": marketplace.handle_ebisus_wallet,
    "/api/ebisus-validator": marketplace.handle_ebisus_validator,
    "/api/dex-quote": marketplace.handle_dex_quote,
    "/api/wallet-scan": misc.handle_wallet_scan,
    "/api/metadata": misc.handle_metadata,
    "/rpc": misc.handle_rpc_get,
    "/api/cronos-rpc": misc.handle_rpc_get,
}


class AppHandler(SimpleHTTPRequestHandler):
    def _allowed_origin(self):
        origin = self.headers.get("Origin", "")
        # Local development and Arena's ephemeral HTTPS preview hosts are safe
        # browser origins; production deployments must configure exact origins.
        preview = re.match(r"^https://\d+-[a-zA-Z0-9-]+\.e2b\.app$", origin)
        if origin in ALLOWED_ORIGINS or preview or origin in {"http://localhost:5173", "http://127.0.0.1:5173"}:
            return origin
        return None

    def _send_cors_headers(self):
        origin = self._allowed_origin()
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Credentials", "true")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
            self.send_header("Access-Control-Max-Age", "86400")

    def do_OPTIONS(self):
        if self.headers.get("Origin") and not self._allowed_origin():
            self.send_error(403, "Origin is not allowed.")
            return
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def _proxy_rpc_request(self, body):
        status, content_type, payload = proxy_rpc_payload(body)
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(payload)

    def _read_request_body(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            raise ValueError("Invalid Content-Length.")
        if length < 0 or length > MAX_REQUEST_BYTES:
            raise ValueError(f"Request body exceeds the {MAX_REQUEST_BYTES} byte limit.")
        return self.rfile.read(length)

    def do_POST(self):
        client_ip = self.client_address[0]
        if not check_rate_limit(client_ip):
            self._send_json(429, {"error": RATE_LIMIT_MESSAGE})
            return
        if self.path in ("/rpc", "/api/cronos-rpc"):
            try:
                body = self._read_request_body()
            except ValueError as error:
                self._send_json(400, {"error": str(error)})
                return
            try:
                self._proxy_rpc_request(body)
            except Exception as error:
                self._send_json(502, {"jsonrpc": "2.0", "id": None, "error": {"code": -32000, "message": str(error)}})
            return
        handler = POST_ROUTES.get(self.path)
        if handler:
            handler(self, client_ip)
            return
        self.send_error(404)

    def do_GET(self):
        client_ip = self.client_address[0]
        if (self.path.startswith("/api/") or self.path.startswith("/rpc")) and not check_rate_limit(client_ip):
            self._send_json(429, {"error": RATE_LIMIT_MESSAGE})
            return
        parsed = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed.query)
        if parsed.path.startswith("/exports/"):
            handle_exports_serve(self, parsed.path)
            return
        handler = GET_ROUTES.get(parsed.path)
        if handler:
            handler(self, query, client_ip)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

"""server/__main__.py — boot entry point for the modular backend."""
import os
from http.server import ThreadingHTTPServer

from .app import AppHandler


def main():
    port = int(os.environ.get("PORT", "4173"))
    server = ThreadingHTTPServer(("0.0.0.0", port), AppHandler)
    print(f"Cronos Town server listening on 0.0.0.0:{port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

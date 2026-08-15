"""Cronos Town — backend boot shim.

Behavior-preserving migration: the backend now lives in the `server/` package.
This file preserves the original `python server.py` entry point exactly.
"""
from server.__main__ import main

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Cronos Town — Zero-Regression Verification Gate.

Every phase of the modular migration must pass this harness before it ships.
It enforces five checks:

  1. JS syntax     — extract inline <script> blocks from index.html -> node -c
  2. Python syntax — py_compile every .py in the project
  3. Sentinel integrity — every string in tools/sentinels.json must still exist
  4. Module index  — if src/module-index.json exists, every declared module must
                     exist on disk (extraction progress is tracked here)
  5. (optional) endpoint smoke test — boot the server and hit canary routes

Usage:
  python3 tools/verify_regression.py            # checks 1-4
  python3 tools/verify_regression.py --smoke    # also boots server + curls routes
"""
import json
import re
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
SERVER = ROOT / "server.py"
SENTINELS = ROOT / "tools" / "sentinels.json"
MODULE_INDEX = ROOT / "src" / "module-index.json"
MODULE_INDEX_ALT = ROOT / "studio" / "src" / "module-index.json"

results = {"pass": 0, "fail": 0}


def report(ok, label, detail=""):
    status = "PASS" if ok else "FAIL"
    results["pass" if ok else "fail"] += 1
    suffix = f"  -> {detail}" if detail and not ok else ""
    print(f"  [{status}] {label}{suffix}")


def check_js_syntax():
    html = INDEX.read_text(encoding="utf-8")
    scripts = re.findall(r"<script(?![^>]*src)[^>]*>(.*?)</script>", html, re.S)
    if not scripts:
        report(False, "JS syntax", "no inline script blocks found")
        return
    combined = "\n;\n".join(scripts)
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
        f.write(combined)
        tmp = f.name
    try:
        proc = subprocess.run(["node", "-c", tmp], capture_output=True, text=True)
        ok = proc.returncode == 0
        report(ok, f"JS syntax ({len(scripts)} blocks, {len(combined)} chars)", proc.stderr.strip()[:300])
    except FileNotFoundError:
        report(False, "JS syntax", "node not found on PATH")
    finally:
        Path(tmp).unlink(missing_ok=True)


def check_python_syntax():
    files = [SERVER] + sorted((ROOT / "server").rglob("*.py")) if (ROOT / "server").exists() else [SERVER]
    for py in files:
        if not py.exists():
            continue
        proc = subprocess.run(["python3", "-m", "py_compile", str(py)], capture_output=True, text=True)
        report(proc.returncode == 0, f"Python syntax ({py.relative_to(ROOT)})", proc.stderr.strip()[:300])


def _all_server_text():
    """Concatenate server.py + the server/ package so sentinels can live anywhere."""
    parts = [SERVER.read_text(encoding="utf-8")] if SERVER.exists() else []
    pkg = ROOT / "server"
    if pkg.is_dir():
        for py in sorted(pkg.rglob("*.py")):
            parts.append(py.read_text(encoding="utf-8"))
    return "\n".join(parts)


def check_sentinels():
    if not SENTINELS.exists():
        report(False, "Sentinels", f"missing {SENTINELS.name}")
        return
    data = json.loads(SENTINELS.read_text(encoding="utf-8"))
    html = INDEX.read_text(encoding="utf-8")
    server = _all_server_text()
    missing = []
    for group, items in data.items():
        for item in items:
            if item not in html and item not in server:
                missing.append(f"[{group}] {item}")
    report(not missing, f"Sentinel integrity ({len(missing)} missing of {sum(len(v) for v in data.values())})", "\n".join(missing[:12]))


def check_module_index():
    idx_path = MODULE_INDEX if MODULE_INDEX.exists() else (MODULE_INDEX_ALT if MODULE_INDEX_ALT.exists() else None)
    if idx_path is None:
        print("  [SKIP] module-index.json (not started yet)")
        return
    idx = json.loads(idx_path.read_text(encoding="utf-8"))
    modules = idx.get("modules", [])
    missing = [m for m in modules if not (ROOT / m).exists()]
    report(not missing, f"Module index ({len(modules)} declared, {len(missing)} missing)", "\n".join(missing[:12]))


def check_ts_build():
    """If the modular studio exists, typecheck + build it to prove zero TS errors."""
    studio = ROOT / "studio"
    if not (studio / "package.json").exists():
        print("  [SKIP] TypeScript build (studio/ not present)")
        return
    proc = subprocess.run(["npm", "run", "build"], cwd=studio, capture_output=True, text=True, timeout=300)
    ok = proc.returncode == 0
    report(ok, "TypeScript typecheck + Vite build (studio/)", (proc.stdout + proc.stderr).strip().splitlines()[-1] if not ok else "")


def check_unit_tests():
    """Run the domain-layer unit tests that lock legacy behavior outputs."""
    studio = ROOT / "studio"
    if not (studio / "package.json").exists() or not (studio / "tests").exists():
        print("  [SKIP] unit tests (studio/tests not present)")
        return
    proc = subprocess.run(["npx", "vitest", "run"], cwd=studio, capture_output=True, text=True, timeout=300)
    ok = proc.returncode == 0
    tail = (proc.stdout + proc.stderr).strip().splitlines()
    summary = next((l for l in tail if "Test Files" in l or "Tests" in l and "passed" in l), tail[-1] if tail else "")
    report(ok, "Unit tests (studio/tests)", summary)


def check_smoke():
    if "--smoke" not in sys.argv:
        print("  [SKIP] endpoint smoke test (pass --smoke to enable)")
        return
    proc = subprocess.Popen(["python3", str(SERVER)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        time.sleep(1.5)
        routes = [
            ("POST", "/api/battle-cards/scan", b'{"wallet":"0x0000000000000000000000000000000000000000"}'),
            ("POST", "/api/token-launch/build-tx", b'{"name":"Wolf Street Token","symbol":"WOLF","supply":1000000,"tax":2,"owner":"0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23"}'),
            ("GET", "/api/vvs/status", None),
        ]
        for method, path, body in routes:
            req = urllib.request.Request(
                f"http://127.0.0.1:4173{path}",
                data=body,
                method=method,
                headers={"Content-Type": "application/json"} if body else {},
            )
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    report(200 <= resp.status < 300, f"smoke {method} {path}", f"HTTP {resp.status}")
            except Exception as e:
                report(False, f"smoke {method} {path}", str(e)[:200])
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()


def main():
    print("Cronos Town — Zero-Regression Verification Gate\n")
    check_js_syntax()
    check_python_syntax()
    check_sentinels()
    check_module_index()
    check_ts_build()
    check_unit_tests()
    check_smoke()
    print(f"\n{results['pass']} passed, {results['fail']} failed")
    sys.exit(1 if results["fail"] else 0)


if __name__ == "__main__":
    main()

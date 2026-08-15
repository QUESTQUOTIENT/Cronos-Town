"""server/export.py — project ZIP builder and its routes."""
import base64
import io
import json
import secrets
import time
import zipfile
from pathlib import Path

from .config import PROJECT_ROOT
from .security import generate_hmac_signature


def build_project_zip(payload):
    root = PROJECT_ROOT
    custom_files = {}
    counter = 0

    def slug(value):
        text = str(value or "sprite").lower()
        return "".join(char if char.isalnum() or char in "-_" else "-" for char in text).strip("-") or "sprite"

    def normalize_asset(value, hint="sprite"):
        nonlocal counter
        if isinstance(value, dict):
            return {key: normalize_asset(item, f"{hint}-{key}") for key, item in value.items()}
        if isinstance(value, list):
            return [normalize_asset(item, f"{hint}-{index}") for index, item in enumerate(value)]
        if not isinstance(value, str) or not value.startswith("data:image/png;base64,"):
            return value
        encoded = value.split(",", 1)[1]
        try:
            raw = base64.b64decode(encoded, validate=True)
        except Exception as error:
            raise ValueError(f"Invalid PNG data for {hint}: {error}")
        if len(raw) > 8 * 1024 * 1024:
            raise ValueError("A custom PNG is larger than 8 MB.")
        counter += 1
        path = f"sprites/custom/{slug(hint)}-{counter}.png"
        custom_files[path] = raw
        return path

    studio_project = payload.get("studioProject")
    if studio_project is not None:
        if not isinstance(studio_project, dict) or studio_project.get("format") != "chronos-studio-project" or studio_project.get("version") != 1:
            raise ValueError("studioProject must be a Chronos Studio Project v1 snapshot.")
        if not isinstance(studio_project.get("objects"), list):
            raise ValueError("studioProject.objects must be a list.")
        # Round-trip through JSON so exported project data is portable and cannot
        # carry non-JSON values from an embedding client.
        studio_project = json.loads(json.dumps(studio_project))

    export_payload = {
        "customizerSprites": normalize_asset(payload.get("customizerSprites") or {}, "customizer"),
        "mapEditorState": normalize_asset(payload.get("mapEditorState") or {"exterior": [], "interior": {}}, "map-editor"),
        "studioProject": studio_project,
    }
    export_payload["version"] = 2
    index_path = root / "index.html"
    index = index_path.read_text(encoding="utf-8")
    state_script = "<script>window.CRONOS_TOWN_EXPORT_STATE = " + json.dumps(export_payload, separators=(",", ":")) + ";</script>\n"
    marker = "  <script>\n    const viewColumns"
    if marker not in index:
        raise ValueError("index.html export marker was not found")
    index = index.replace(marker, state_script + marker, 1)
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for relative in ("index.html", "server.py", "README.md"):
            path = root / relative
            if path.exists():
                archive.writestr(relative, index if relative == "index.html" else path.read_bytes())
        # Bundle the modular backend package so the exported project stays runnable.
        server_pkg = root / "server"
        if server_pkg.is_dir():
            for path in sorted(server_pkg.rglob("*.py")):
                archive.write(path, path.relative_to(root).as_posix())
        sprite_root = root / "sprites"
        if sprite_root.exists():
            for path in sorted(sprite_root.rglob("*")):
                if path.is_file():
                    archive.write(path, path.relative_to(root).as_posix())
        for relative, raw in custom_files.items():
            archive.writestr(relative, raw)
        if studio_project is not None:
            archive.writestr("studio/project.json", json.dumps(studio_project, indent=2, sort_keys=True))
            archive.writestr(
                "studio/README.md",
                "# Chronos Studio Project\n\n"
                "`project.json` is the canonical authored-object snapshot. The runtime, "
                "studio, graph, and exported configuration consume these same objects.\n",
            )
        export_info = {
            "network": "Cronos Mainnet",
            "chainId": 25,
            "files": len(archive.namelist()) + 1,
            "version": "2026.8",
            "hmacSignature": generate_hmac_signature(json.dumps(export_payload, sort_keys=True).encode("utf-8")),
            "timestamp": int(time.time()),
            "securityPolicy": "HMAC-SHA256 Server-Signed Integrity (Phase 1.2)"
        }
        archive.writestr("EXPORT-INFO.json", json.dumps(export_info, indent=2))
    return output.getvalue()


def handle_export(h, client_ip=None):
    try:
        raw = h._read_request_body()
        if len(raw) > 32 * 1024 * 1024:
            raise ValueError("Export state is larger than 32 MB.")
        payload = json.loads(raw.decode("utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("Export body must be an object.")
        archive = build_project_zip(payload)
        export_root = PROJECT_ROOT / "exports"
        export_root.mkdir(parents=True, exist_ok=True)
        filename = f"cronos-town-custom-{secrets.token_hex(5)}.zip"
        (export_root / filename).write_bytes(archive)
        h._send_json(200, {"downloadUrl": f"/exports/{filename}", "filename": filename})
    except Exception as error:
        h._send_json(400, {"error": str(error)})


def handle_exports_serve(h, path):
    filename = Path(path[len("/exports/"):]).name
    export_root = PROJECT_ROOT / "exports"
    export_path = export_root / filename
    if filename != path[len("/exports/"):] or not filename.endswith(".zip") or not export_path.is_file():
        h.send_error(404)
        return
    body = export_path.read_bytes()
    h.send_response(200)
    h.send_header("Content-Type", "application/zip")
    h.send_header("Content-Disposition", f'attachment; filename="{filename}"')
    h.send_header("Content-Length", str(len(body)))
    h.send_header("Cache-Control", "no-store")
    h.end_headers()
    h.wfile.write(body)

"""Boundary sanitizers for untrusted third-party display metadata."""
import html


def safe_text(value, limit=512):
    """Return a bounded HTML-safe display string; preserve non-string primitives."""
    if value is None:
        return ""
    return html.escape(str(value)[:limit], quote=True)


def sanitize_nft_metadata(value):
    """Recursively sanitize common NFT display fields without corrupting URLs/IDs."""
    if isinstance(value, list):
        return [sanitize_nft_metadata(item) for item in value]
    if not isinstance(value, dict):
        return value
    display_fields = {"name", "description", "title", "symbol", "collectionName", "trait_type", "value"}
    result = {}
    for key, item in value.items():
        result[key] = safe_text(item) if key in display_fields and not isinstance(item, (dict, list)) else sanitize_nft_metadata(item)
    return result

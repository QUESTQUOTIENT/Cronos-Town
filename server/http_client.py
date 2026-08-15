"""server/http_client.py — thin JSON HTTP helpers for upstream services."""
import json
import urllib.error
import urllib.request


def fetch_json(url, timeout=30):
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "Cronos-Town/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8")
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            raise
    return json.loads(body)


def post_json(url, payload):
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Cronos-Town/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, response.headers.get("Content-Type", "application/json"), response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.headers.get("Content-Type", "application/json"), error.read()


def fetch_upstream_response(url):
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "Cronos-Town/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, response.headers.get("Content-Type", "application/json"), response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.headers.get("Content-Type", "application/json"), error.read()


def delete_json(url):
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "Cronos-Town/1.0",
        },
        method="DELETE",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, response.headers.get("Content-Type", "application/json"), response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.headers.get("Content-Type", "application/json"), error.read()

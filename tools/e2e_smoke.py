#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]


def main() -> int:
    web_package = BASE / "apps" / "web" / "package.json"
    api_main = BASE / "services" / "api" / "app" / "main.py"
    openapi = BASE / "packages" / "contracts" / "openapi" / "openapi.json"

    missing = [path for path in [web_package, api_main, openapi] if not path.exists()]
    if missing:
        for path in missing:
            print(f"missing: {path.relative_to(BASE)}")
        return 1

    schema = json.loads(openapi.read_text(encoding="utf-8"))
    paths = schema.get("paths", {})
    required_paths = {
        "/api/v1/health/live",
        "/api/v1/health/ready",
        "/api/v1/auth/register",
        "/api/v1/auth/login",
        "/api/v1/me",
        "/api/v1/me/sessions",
        "/api/v1/workspaces",
        "/api/v1/plans",
        "/api/v1/workspaces/{workspace_id}/subscription",
        "/api/v1/workspaces/{workspace_id}/checkout",
    }
    missing_paths = sorted(required_paths - set(paths))
    if missing_paths:
        for path in missing_paths:
            print(f"missing openapi path: {path}")
        return 1

    print("Phase 02 smoke passed: SaaS shell and OpenAPI auth/workspace/billing paths are present.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

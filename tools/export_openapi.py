#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE / "services" / "api"))

from app.main import create_app  # noqa: E402


def main() -> int:
    schema = create_app().openapi()
    targets = [
        BASE / "packages" / "contracts" / "openapi" / "openapi.json",
        BASE / "apps" / "web" / "src" / "generated-api" / "openapi.json",
    ]
    for target in targets:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(
            json.dumps(schema, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(target.relative_to(BASE))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

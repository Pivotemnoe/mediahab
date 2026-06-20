#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import os
from pathlib import Path

import asyncpg

BASE = Path(__file__).resolve().parents[1]
SEED_DIR = BASE / "database" / "seeds"


def asyncpg_url(url: str) -> str:
    return url.replace("postgresql+asyncpg://", "postgresql://")


async def run_seed() -> None:
    url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://media_hub:media_hub@localhost:55434/media_hub",
    )
    connection = await asyncpg.connect(asyncpg_url(url))
    try:
        for path in sorted(SEED_DIR.glob("*.sql")):
            await connection.execute(path.read_text(encoding="utf-8"))
    finally:
        await connection.close()


def main() -> int:
    asyncio.run(run_seed())
    print(f"Seeds applied from {SEED_DIR.relative_to(BASE)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

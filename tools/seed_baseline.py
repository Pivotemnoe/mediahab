#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import os
from pathlib import Path

import asyncpg

BASE = Path(__file__).resolve().parents[1]
SEED_PATH = BASE / "database" / "seeds" / "phase01_baseline.sql"


def asyncpg_url(url: str) -> str:
    return url.replace("postgresql+asyncpg://", "postgresql://")


async def run_seed() -> None:
    url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://media_hub:media_hub@localhost:55434/media_hub",
    )
    sql = SEED_PATH.read_text(encoding="utf-8")
    connection = await asyncpg.connect(asyncpg_url(url))
    try:
        await connection.execute(sql)
    finally:
        await connection.close()


def main() -> int:
    asyncio.run(run_seed())
    print(f"Phase 01 seed applied: {SEED_PATH.relative_to(BASE)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

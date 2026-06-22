#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

import uvicorn

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE / "services" / "api"))

from app.db.base import Base  # noqa: E402
from app.db.session import engine  # noqa: E402
from app.main import create_app  # noqa: E402


async def create_schema() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run a local API smoke server with the configured database.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8000, type=int)
    parser.add_argument("--log-level", default="warning")
    args = parser.parse_args()

    asyncio.run(create_schema())
    uvicorn.run(create_app(), host=args.host, port=args.port, log_level=args.log_level)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

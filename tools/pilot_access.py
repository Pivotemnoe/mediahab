#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlencode

from sqlalchemy import select


ROOT = Path(__file__).resolve().parents[1]
API_ROOT = ROOT / "services" / "api"
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.core.config import get_settings  # noqa: E402
from app.db.base import (  # noqa: E402
    PasswordResetToken,
    PilotAccessInvite,
    User,
    utc_now,
)
from app.db.session import AsyncSessionLocal  # noqa: E402
from app.modules.auth.security import (  # noqa: E402
    generate_secret,
    hash_secret,
    normalize_email,
)


async def create_invite(email: str, expires_hours: int, created_by: str | None) -> str:
    normalized_email = normalize_email(email)
    token = generate_secret()
    now = utc_now()
    async with AsyncSessionLocal() as session:
        creator_id = None
        if created_by:
            creator = await session.scalar(
                select(User).where(User.email == normalize_email(created_by))
            )
            if creator is None:
                raise RuntimeError("The creator account was not found.")
            creator_id = creator.id

        existing = (
            await session.scalars(
                select(PilotAccessInvite).where(
                    PilotAccessInvite.email == normalized_email,
                    PilotAccessInvite.consumed_at.is_(None),
                    PilotAccessInvite.revoked_at.is_(None),
                )
            )
        ).all()
        for invite in existing:
            invite.revoked_at = now

        session.add(
            PilotAccessInvite(
                email=normalized_email,
                token_hash=hash_secret(token),
                created_by_user_id=creator_id,
                expires_at=now + timedelta(hours=expires_hours),
                created_at=now,
            )
        )
        await session.commit()

    settings = get_settings()
    query = urlencode({"invite": token, "email": normalized_email})
    return f"{settings.pilot_public_base_url.rstrip('/')}/register?{query}"


async def create_reset_link(email: str, expires_hours: int) -> str:
    normalized_email = normalize_email(email)
    token = generate_secret()
    now = utc_now()
    async with AsyncSessionLocal() as session:
        user = await session.scalar(select(User).where(User.email == normalized_email))
        if user is None:
            raise RuntimeError("The account was not found.")

        existing = (
            await session.scalars(
                select(PasswordResetToken).where(
                    PasswordResetToken.user_id == user.id,
                    PasswordResetToken.consumed_at.is_(None),
                )
            )
        ).all()
        for reset in existing:
            reset.consumed_at = now

        session.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=hash_secret(token),
                expires_at=now + timedelta(hours=expires_hours),
                created_at=now,
            )
        )
        await session.commit()

    settings = get_settings()
    query = urlencode({"token": token})
    return f"{settings.pilot_public_base_url.rstrip('/')}/reset-password?{query}"


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(
        description="Create one-time closed-pilot registration or password-reset links."
    )
    subcommands = result.add_subparsers(dest="command", required=True)

    invite = subcommands.add_parser("invite", help="Create an email-bound registration link.")
    invite.add_argument("--email", required=True)
    invite.add_argument("--expires-hours", type=int, default=72)
    invite.add_argument("--created-by")

    reset = subcommands.add_parser("reset", help="Create a password-reset link for an existing user.")
    reset.add_argument("--email", required=True)
    reset.add_argument("--expires-hours", type=int, default=2)
    return result


async def run(args: argparse.Namespace) -> str:
    if args.expires_hours < 1 or args.expires_hours > 24 * 30:
        raise RuntimeError("Expiration must be between 1 hour and 30 days.")
    if args.command == "invite":
        return await create_invite(args.email, args.expires_hours, args.created_by)
    return await create_reset_link(args.email, args.expires_hours)


def main() -> int:
    args = parser().parse_args()
    try:
        link = asyncio.run(run(args))
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    print(link)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

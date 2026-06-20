from __future__ import annotations

import asyncio
import sys
import tempfile
import unittest
from pathlib import Path
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

BASE = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(BASE / "services" / "api"))

from fastapi.testclient import TestClient  # noqa: E402

from app.db.base import Base, Membership, User, utc_now  # noqa: E402
from app.db.session import get_session  # noqa: E402
from app.main import create_app  # noqa: E402


class Phase02AuthWorkspaceBillingTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmpdir = tempfile.TemporaryDirectory()
        db_path = Path(self.tmpdir.name) / "phase02-test.sqlite"
        self.engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")
        self.SessionLocal = async_sessionmaker(self.engine, expire_on_commit=False)
        asyncio.run(self._create_schema())
        self.app = create_app()

        async def override_session():
            async with self.SessionLocal() as session:
                yield session

        self.app.dependency_overrides[get_session] = override_session
        self.client = TestClient(self.app, base_url="https://testserver")

    def tearDown(self) -> None:
        self.client.close()
        asyncio.run(self.engine.dispose())
        self.tmpdir.cleanup()

    async def _create_schema(self) -> None:
        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

    async def _user_by_email(self, email: str) -> User:
        async with self.SessionLocal() as session:
            user = await session.scalar(select(User).where(User.email == email))
            assert user is not None
            return user

    async def _add_membership(self, workspace_id: UUID, user_id: UUID, role: str) -> None:
        async with self.SessionLocal() as session:
            session.add(
                Membership(
                    workspace_id=workspace_id,
                    user_id=user_id,
                    role_key=role,
                    publication_permission="denied",
                    accepted_at=utc_now(),
                    created_at=utc_now(),
                    updated_at=utc_now(),
                    version=1,
                )
            )
            await session.commit()

    def register(
        self,
        client: TestClient,
        email: str = "owner@example.com",
        password: str = "strong-password-123",
        workspace_name: str = "Owner Workspace",
    ) -> dict[str, object]:
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": password,
                "display_name": "Test Owner",
                "workspace_name": workspace_name,
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def csrf_headers(self, payload: dict[str, object]) -> dict[str, str]:
        return {"X-CSRF-Token": str(payload["csrf_token"])}

    def test_register_sets_secure_http_only_cookies_and_argon2_hash(self) -> None:
        payload = self.register(self.client)
        self.assertIn("csrf_token", payload)
        cookie_headers = self.client.post(
            "/api/v1/auth/login",
            json={"email": "owner@example.com", "password": "strong-password-123"},
        ).headers.get_list("set-cookie")
        session_cookie = next(item for item in cookie_headers if item.startswith("tmh_session="))
        csrf_cookie = next(item for item in cookie_headers if item.startswith("tmh_csrf="))
        self.assertIn("HttpOnly", session_cookie)
        self.assertIn("Secure", session_cookie)
        self.assertIn("SameSite=lax", session_cookie)
        self.assertIn("Secure", csrf_cookie)
        self.assertNotIn("HttpOnly", csrf_cookie)

        user = asyncio.run(self._user_by_email("owner@example.com"))
        self.assertTrue(user.password_hash.startswith("$argon2id$"))
        self.assertNotIn("strong-password-123", user.password_hash)

    def test_csrf_required_for_cookie_authenticated_mutation(self) -> None:
        self.register(self.client)
        response = self.client.post("/api/v1/workspaces", json={"name": "No CSRF"})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["error"]["code"], "csrf_required")

    def test_rate_limit_blocks_auth_abuse(self) -> None:
        last_response = None
        for _ in range(6):
            last_response = self.client.post(
                "/api/v1/auth/login",
                json={"email": "missing@example.com", "password": "wrong"},
            )
        assert last_response is not None
        self.assertEqual(last_response.status_code, 429)
        self.assertEqual(last_response.json()["error"]["code"], "rate_limited")

    def test_revoked_session_stops_working(self) -> None:
        payload = self.register(self.client)
        logout = self.client.post("/api/v1/auth/logout", headers=self.csrf_headers(payload))
        self.assertEqual(logout.status_code, 200, logout.text)
        response = self.client.get("/api/v1/me")
        self.assertEqual(response.status_code, 401)

    def test_cross_workspace_access_returns_404(self) -> None:
        owner_payload = self.register(self.client, email="owner-a@example.com")
        workspace_id = owner_payload["workspace"]["id"]
        other = TestClient(self.app, base_url="https://testserver")
        try:
            self.register(other, email="owner-b@example.com", workspace_name="Other Workspace")
            response = other.get(f"/api/v1/workspaces/{workspace_id}")
            self.assertEqual(response.status_code, 404)
            self.assertEqual(response.json()["error"]["code"], "workspace_not_found")
        finally:
            other.close()

    def test_role_denial_and_free_plan_seat_limit(self) -> None:
        owner_payload = self.register(self.client, email="owner-role@example.com")
        workspace_id = UUID(str(owner_payload["workspace"]["id"]))
        other = TestClient(self.app, base_url="https://testserver")
        try:
            other_payload = self.register(other, email="viewer-role@example.com", workspace_name="Viewer Workspace")
            user_id = UUID(str(other_payload["user"]["id"]))
            invite = self.client.post(
                f"/api/v1/workspaces/{workspace_id}/invitations",
                headers=self.csrf_headers(owner_payload),
                json={"email": "viewer-role@example.com", "role": "viewer"},
            )
            self.assertEqual(invite.status_code, 402)
            self.assertEqual(invite.json()["error"]["code"], "limit_exceeded")

            asyncio.run(self._add_membership(workspace_id, user_id, "viewer"))
            denied = other.patch(
                f"/api/v1/workspaces/{workspace_id}",
                headers=self.csrf_headers(other_payload),
                json={"name": "Denied Rename"},
            )
            self.assertEqual(denied.status_code, 403)
            self.assertEqual(denied.json()["error"]["code"], "role_denied")
        finally:
            other.close()

    def test_mock_checkout_never_captures_payment(self) -> None:
        payload = self.register(self.client)
        workspace_id = payload["workspace"]["id"]
        response = self.client.post(
            f"/api/v1/workspaces/{workspace_id}/checkout",
            headers=self.csrf_headers(payload),
            json={"plan_key": "pro"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        checkout = response.json()
        self.assertEqual(checkout["provider_key"], "mock")
        self.assertEqual(checkout["status"], "pending_manual_contact")
        self.assertFalse(checkout["payment_captured"])


if __name__ == "__main__":
    unittest.main()

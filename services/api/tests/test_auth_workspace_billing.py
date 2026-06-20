from __future__ import annotations

import asyncio
import sys
import tempfile
import unittest
from pathlib import Path
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

BASE = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(BASE / "services" / "api"))

from fastapi.testclient import TestClient  # noqa: E402

from app.db.base import (  # noqa: E402
    AuditLog,
    Base,
    Invoice,
    Membership,
    Payment,
    PaymentCustomer,
    PaymentWebhookInbox,
    SubscriptionEvent,
    User,
    utc_now,
)
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

    async def _billing_count(self, model: type, workspace_id: UUID) -> int:
        async with self.SessionLocal() as session:
            return int(
                await session.scalar(
                    select(func.count()).select_from(model).where(model.workspace_id == workspace_id)
                )
                or 0
            )

    async def _audit_actions(self, workspace_id: UUID) -> list[str]:
        async with self.SessionLocal() as session:
            rows = await session.scalars(
                select(AuditLog).where(AuditLog.workspace_id == workspace_id).order_by(AuditLog.created_at.asc())
            )
            return [row.action for row in rows]

    async def _webhook_headers(self, event_id: str) -> dict[str, object]:
        async with self.SessionLocal() as session:
            inbox = await session.scalar(
                select(PaymentWebhookInbox).where(PaymentWebhookInbox.event_id == event_id)
            )
            assert inbox is not None
            return inbox.headers_json if isinstance(inbox.headers_json, dict) else {}

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
        workspace_id = UUID(str(payload["workspace"]["id"]))
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
        self.assertIn("No payment was captured", checkout["message"])
        self.assertEqual(asyncio.run(self._billing_count(PaymentCustomer, workspace_id)), 1)
        self.assertIn("billing.checkout_created", asyncio.run(self._audit_actions(workspace_id)))

    def test_admin_plan_assignment_updates_entitlements_and_audit(self) -> None:
        payload = self.register(self.client, email="admin-plan@example.com")
        workspace_id = UUID(str(payload["workspace"]["id"]))
        response = self.client.post(
            f"/api/v1/admin/workspaces/{workspace_id}/assign-plan",
            headers={"X-Admin-Token": "local-admin-token"},
            json={"plan_key": "pro", "status": "active"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["plan_key"], "pro")

        usage = self.client.get(f"/api/v1/workspaces/{workspace_id}/usage")
        self.assertEqual(usage.status_code, 200, usage.text)
        usage_payload = usage.json()
        self.assertEqual(usage_payload["entitlements"]["projects.max"], 15)
        projects_limit = next(item for item in usage_payload["limits"] if item["key"] == "projects.max")
        self.assertEqual(projects_limit["limit"], 15.0)
        self.assertEqual(projects_limit["status"], "ok")
        self.assertEqual(asyncio.run(self._billing_count(SubscriptionEvent, workspace_id)), 1)
        self.assertIn("billing.plan_assigned", asyncio.run(self._audit_actions(workspace_id)))

    def test_mock_payment_webhook_replay_is_idempotent(self) -> None:
        payload = self.register(self.client, email="webhook-plan@example.com")
        workspace_id = UUID(str(payload["workspace"]["id"]))
        checkout = self.client.post(
            f"/api/v1/workspaces/{workspace_id}/checkout",
            headers=self.csrf_headers(payload),
            json={"plan_key": "pro"},
        )
        self.assertEqual(checkout.status_code, 200, checkout.text)
        event_payload = {
            "event_id": "evt_phase11_webhook_1",
            "type": "checkout.completed",
            "workspace_id": str(workspace_id),
            "checkout_id": checkout.json()["checkout_id"],
            "plan_key": "pro",
            "provider_customer_id": "mock_cus_phase11",
            "provider_subscription_id": "mock_sub_phase11",
            "provider_payment_id": "mock_pay_phase11",
            "provider_invoice_id": "mock_inv_phase11",
            "amount_minor": 0,
            "currency": "RUB",
        }
        webhook = self.client.post(
            "/api/v1/webhooks/payments/mock",
            headers={"X-Mock-Payment-Signature": "local-mock-payment-secret"},
            json=event_payload,
        )
        self.assertEqual(webhook.status_code, 200, webhook.text)
        self.assertEqual(webhook.json()["status"], "processed")
        self.assertTrue(webhook.json()["processed"])
        self.assertEqual(webhook.json()["subscription"]["plan_key"], "pro")
        self.assertFalse(webhook.json()["subscription"]["payment_captured"])

        replay = self.client.post(
            "/api/v1/webhooks/payments/mock",
            headers={"X-Mock-Payment-Signature": "local-mock-payment-secret"},
            json=event_payload,
        )
        self.assertEqual(replay.status_code, 200, replay.text)
        self.assertEqual(replay.json()["status"], "duplicate")
        self.assertFalse(replay.json()["processed"])

        self.assertEqual(asyncio.run(self._billing_count(PaymentWebhookInbox, workspace_id)), 1)
        self.assertEqual(asyncio.run(self._billing_count(Payment, workspace_id)), 1)
        self.assertEqual(asyncio.run(self._billing_count(Invoice, workspace_id)), 1)
        self.assertEqual(asyncio.run(self._billing_count(SubscriptionEvent, workspace_id)), 1)
        stored_headers = asyncio.run(self._webhook_headers("evt_phase11_webhook_1"))
        self.assertEqual(stored_headers["x-mock-payment-signature"], "[redacted]")

        payments = self.client.get("/api/v1/billing/payments")
        self.assertEqual(payments.status_code, 200, payments.text)
        self.assertEqual(len(payments.json()["payments"]), 1)
        self.assertFalse(payments.json()["payments"][0]["payment_captured"])
        invoices = self.client.get("/api/v1/billing/invoices")
        self.assertEqual(invoices.status_code, 200, invoices.text)
        self.assertEqual(len(invoices.json()["invoices"]), 1)


if __name__ == "__main__":
    unittest.main()

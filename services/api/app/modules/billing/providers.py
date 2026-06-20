from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol
from uuid import UUID

from app.core.config import Settings


@dataclass(frozen=True)
class CheckoutIntent:
    workspace_id: UUID
    plan_key: str
    customer_id: str


@dataclass(frozen=True)
class CheckoutResult:
    provider_key: str
    status: str
    payment_captured: bool
    message: str
    provider_session_id: str | None = None


class PaymentProvider(Protocol):
    key: str

    def create_checkout(self, intent: CheckoutIntent) -> CheckoutResult: ...

    def verify_webhook(self, headers: dict[str, str], payload: dict[str, object]) -> bool: ...


class MockPaymentProvider:
    key = "mock"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def create_checkout(self, intent: CheckoutIntent) -> CheckoutResult:
        return CheckoutResult(
            provider_key=self.key,
            status="pending_manual_contact",
            payment_captured=False,
            message="Mock checkout created. No payment was captured.",
            provider_session_id=f"mock_checkout_{intent.workspace_id.hex[:12]}_{intent.plan_key}",
        )

    def verify_webhook(self, headers: dict[str, str], payload: dict[str, object]) -> bool:
        signature = headers.get("x-mock-payment-signature")
        return bool(signature and signature == self.settings.mock_payment_webhook_secret)


def get_payment_provider(provider_key: str, settings: Settings) -> PaymentProvider | None:
    if provider_key == "mock":
        return MockPaymentProvider(settings)
    return None

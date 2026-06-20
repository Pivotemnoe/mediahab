from __future__ import annotations

import sys
import unittest
from pathlib import Path

BASE = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(BASE / "services" / "api"))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import create_app  # noqa: E402


class HealthApiTest(unittest.TestCase):
    def test_live_health(self) -> None:
        client = TestClient(create_app())
        response = client.get("/api/v1/health/live")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_ready_health(self) -> None:
        client = TestClient(create_app())
        response = client.get("/api/v1/health/ready")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertIn("database", payload["checks"])


if __name__ == "__main__":
    unittest.main()

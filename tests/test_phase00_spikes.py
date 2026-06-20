from __future__ import annotations

import sys
import unittest
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE / "tools"))

import phase00_spikes  # noqa: E402


class Phase00SpikeContractsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.fixture = phase00_spikes.load_fixture()

    def test_fixture_contract_matches_spec(self) -> None:
        self.assertEqual(len(self.fixture["text"]), 4069)
        self.assertEqual(self.fixture["expected_platform_count"], 4069)
        media = self.fixture["media"]
        self.assertEqual(media["images"], 7)
        self.assertEqual(media["videos"], 3)
        self.assertEqual(media["total_items"], 10)

    def test_telegram_rich_message_payload(self) -> None:
        payload = phase00_spikes.telegram_snapshot(self.fixture)
        self.assertEqual(payload["method"], "sendRichMessage")
        self.assertEqual(payload["mode"], "rich_message")
        self.assertIn("<tg-collage>", payload["rich_html"])
        self.assertEqual(payload["rich_html"].count("<img "), 7)
        self.assertEqual(payload["rich_html"].count("<video "), 3)
        self.assertEqual(payload["text_char_count"], 4069)
        self.assertTrue(payload["within_documented_rich_text_limit"])
        self.assertEqual(payload["media"]["total_items"], 10)
        self.assertEqual(payload["live_status"], "not_run_no_credentials")

    def test_max_payload_is_clamped_and_keeps_auth_out_of_query(self) -> None:
        payload = phase00_spikes.max_snapshot(self.fixture)
        request = payload["message_request"]
        self.assertLessEqual(payload["text_char_count"], 4000)
        self.assertTrue(payload["within_documented_text_limit"])
        self.assertEqual(len(request["body"]["attachments"]), 10)
        self.assertNotIn("access_token", request["query"])
        self.assertEqual(request["headers"]["Authorization"], "<redacted>")
        self.assertEqual(
            payload["observed_attachment_capability"]["status"],
            "pending_live_test",
        )

    def test_max_upload_plan_models_readiness_retry(self) -> None:
        payload = phase00_spikes.max_snapshot(self.fixture)
        self.assertEqual(len(payload["upload_plan"]), 10)
        upload_types = [step["request"]["query"]["type"] for step in payload["upload_plan"]]
        self.assertEqual(upload_types.count("image"), 7)
        self.assertEqual(upload_types.count("video"), 3)
        for step in payload["upload_plan"]:
            self.assertIn("attachment.not.ready", step["readiness_strategy"])

    def test_instagram_readiness_and_container_payload(self) -> None:
        payload = phase00_spikes.instagram_snapshot(self.fixture)
        self.assertLessEqual(payload["caption_char_count"], 2200)
        self.assertTrue(payload["within_documented_caption_limit"])
        children = payload["container_plan"]["children"]
        self.assertEqual(len(children), 10)
        self.assertGreaterEqual(len(children), 2)
        self.assertLessEqual(len(children), 10)
        self.assertEqual(len(payload["container_plan"]["parent"]["children"]), 10)
        self.assertEqual(payload["readiness"]["professional_account"], "missing")
        self.assertEqual(payload["live_status"], "not_run_no_credentials")


if __name__ == "__main__":
    unittest.main()

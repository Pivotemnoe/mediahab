from __future__ import annotations

import unittest

from app.modules.publications.connectors import (
    adapt_text_for_platform,
    capability_for,
    validate_variant,
)
from app.modules.publications.service import build_variant_preflight


class ManualPlatformProfilesTestCase(unittest.TestCase):
    def test_vk_is_a_manual_export_long_post_profile(self) -> None:
        capability = capability_for("vk")

        self.assertEqual(capability.connector_key, "manual_export")
        self.assertEqual(capability.publication_mode, "manual_export")
        self.assertFalse(capability.automated_delivery)
        self.assertEqual(capability.capabilities["output_type"], "community_post")

    def test_reels_is_a_manual_script_and_caption_profile(self) -> None:
        capability = capability_for("reels")
        rendered = adapt_text_for_platform("Первый абзац.\n\nВторой абзац.", "reels")

        self.assertEqual(capability.connector_key, "manual_export")
        self.assertFalse(capability.automated_delivery)
        self.assertEqual(capability.capabilities["output_type"], "script_and_caption")
        self.assertIn("Сценарий Reels", rendered)
        self.assertIn("Подпись", rendered)
        self.assertEqual(validate_variant("reels", rendered)["errors"], [])

    def test_long_instagram_master_is_not_mechanically_truncated(self) -> None:
        master = "Полный исходный абзац с фактами. " * 100

        rendered = adapt_text_for_platform(master, "instagram")

        self.assertEqual(rendered, master)
        self.assertNotIn("[сокращено под лимит площадки]", rendered)
        self.assertNotIn("Сокращённая версия для INSTAGRAM", rendered)
        self.assertFalse(validate_variant("instagram", rendered)["valid"])

    def test_preflight_blocks_a_connector_hard_text_limit(self) -> None:
        text = "д" * 4001
        validation = validate_variant("max", text)

        preflight = build_variant_preflight(
            "max",
            validation,
            {"body_text": text, "length_target": {"min_chars": 1800, "max_chars": 2500}},
            0,
        )

        self.assertEqual(preflight["status"], "block")
        length_check = next(check for check in preflight["checks"] if check["key"] == "length")
        self.assertEqual(length_check["code"], "hard_text_limit_exceeded")
        self.assertEqual(length_check["status"], "block")

    def test_instagram_preflight_reports_format_media_and_manual_delivery(self) -> None:
        text = "Готовая подпись"
        validation = validate_variant("instagram", text, media_count=1)

        preflight = build_variant_preflight(
            "instagram",
            validation,
            {
                "body_text": text,
                "instagram_format": "reel",
                "instagram_media_plan": {"count": 1},
                "length_target": {"min_chars": 1, "max_chars": 2200},
            },
            1,
        )
        checks = {check["key"]: check for check in preflight["checks"]}

        self.assertEqual(checks["media"]["status"], "pass")
        self.assertEqual(checks["format"]["code"], "instagram_format_ready")
        self.assertEqual(checks["delivery"]["code"], "manual_export_required")
        self.assertEqual(preflight["status"], "warning")

    def test_vk_preflight_reports_saved_attachment_package(self) -> None:
        text = "Готовая запись сообщества"
        validation = validate_variant("vk", text, media_count=3)

        preflight = build_variant_preflight(
            "vk",
            validation,
            {
                "body_text": text,
                "length_target": {},
                "vk_export_package": {"attachment_count": 3},
            },
            3,
        )
        checks = {check["key"]: check for check in preflight["checks"]}

        self.assertEqual(checks["media"]["code"], "vk_media_package_ready")
        self.assertIn("3", checks["media"]["message"])
        self.assertEqual(checks["format"]["code"], "vk_community_post_ready")
        self.assertEqual(checks["delivery"]["code"], "manual_export_required")


if __name__ == "__main__":
    unittest.main()

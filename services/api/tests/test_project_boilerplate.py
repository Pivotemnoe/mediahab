from __future__ import annotations

import sys
import unittest
from pathlib import Path

BASE = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(BASE / "services" / "api"))

from app.modules.projects.boilerplate import (  # noqa: E402
    ai_cta_config,
    apply_project_boilerplate,
    strip_project_boilerplate,
)
from app.modules.publications.connectors import validate_variant  # noqa: E402


class ProjectBoilerplateTest(unittest.TestCase):
    def setUp(self) -> None:
        self.config = {
            "guidance": "Завершить вопросом.",
            "header_template": "Старое значение шапки больше не используется",
            "footer_template": "Telegram: https://t.me/example\nMAX: https://max.ru/example",
        }

    def test_applies_exact_link_footer(self) -> None:
        result = apply_project_boilerplate("Основной текст.", self.config)

        self.assertEqual(
            result,
            "Основной текст.\n\nTelegram: https://t.me/example\nMAX: https://max.ru/example",
        )

    def test_ignores_legacy_header_value(self) -> None:
        result = apply_project_boilerplate("Основной текст.", self.config)

        self.assertNotIn("Старое значение шапки", result)

    def test_does_not_duplicate_existing_fixed_blocks(self) -> None:
        once = apply_project_boilerplate("Основной текст.", self.config)

        self.assertEqual(apply_project_boilerplate(once, self.config), once)

    def test_strips_fixed_blocks_before_ai_refinement(self) -> None:
        complete = apply_project_boilerplate("Основной текст.", self.config)

        self.assertEqual(strip_project_boilerplate(complete, self.config), "Основной текст.")

    def test_ai_receives_guidance_but_not_fixed_links(self) -> None:
        self.assertEqual(ai_cta_config(self.config), {"guidance": "Завершить вопросом."})

    def test_fixed_footer_counts_toward_max_limit(self) -> None:
        text = apply_project_boilerplate("x" * 3990, self.config)

        validation = validate_variant("max", text, media_count=0)

        self.assertFalse(validation["valid"])
        self.assertTrue(any(error["code"] == "text_limit_exceeded" for error in validation["errors"]))


if __name__ == "__main__":
    unittest.main()

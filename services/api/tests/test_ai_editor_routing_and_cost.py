from __future__ import annotations

import sys
import unittest
from pathlib import Path

BASE = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(BASE / "services" / "api"))

from app.core.config import Settings  # noqa: E402
from app.modules.ai.providers import text_provider_for  # noqa: E402
from app.modules.ai.service import (  # noqa: E402
    _platform_refinement_requirements,
    estimate_text_cost_micro_usd,
    mock_ratings,
)


class AiEditorRoutingAndCostTest(unittest.TestCase):
    def test_editor_tasks_use_separate_openai_model(self) -> None:
        settings = Settings(
            ai_text_provider="openai",
            openai_api_key="test-only",
            openai_text_model="gpt-4.1-mini",
            openai_editor_model="gpt-5.6-terra",
        )

        self.assertEqual(text_provider_for(settings, "extract_facts").model_id, "gpt-4.1-mini")
        self.assertEqual(text_provider_for(settings, "assemble_master").model_id, "gpt-5.6-terra")
        self.assertEqual(text_provider_for(settings, "refine_variant").model_id, "gpt-5.6-terra")

    def test_known_model_cost_is_stored_in_micro_usd(self) -> None:
        self.assertEqual(
            estimate_text_cost_micro_usd("gpt-4.1-mini", 11_257, 1_951),
            7_624,
        )
        self.assertEqual(
            estimate_text_cost_micro_usd("gpt-5.6-terra", 11_257, 1_951),
            57_408,
        )

    def test_unknown_or_incomplete_usage_has_no_estimate(self) -> None:
        self.assertIsNone(estimate_text_cost_micro_usd("future-model", 100, 100))
        self.assertIsNone(estimate_text_cost_micro_usd("gpt-4.1-mini", None, 100))
        self.assertIsNone(estimate_text_cost_micro_usd("gpt-4.1-mini", 100, None))

    def test_ai_suggests_all_four_editable_ratings_when_user_omits_them(self) -> None:
        ratings = mock_ratings([], "Бургер понравился, соус был острый и довольно жирный.")

        self.assertEqual(set(ratings), {"taste", "impression", "fatness", "spiciness"})
        self.assertTrue(all(isinstance(rating["value"], int) for rating in ratings.values()))
        self.assertTrue(all(rating["source"] == "ai" for rating in ratings.values()))

    def test_instagram_refinement_requires_a_complete_platform_rewrite(self) -> None:
        requirements = " ".join(_platform_refinement_requirements("instagram"))

        self.assertIn("самостоятельную цельную версию", requirements)
        self.assertIn("полному source_blocks", requirements)
        self.assertIn("никогда не отрезай хвост", requirements)
        self.assertIn("[сокращено под лимит площадки]", requirements)
        self.assertEqual(_platform_refinement_requirements("telegram"), [])


if __name__ == "__main__":
    unittest.main()

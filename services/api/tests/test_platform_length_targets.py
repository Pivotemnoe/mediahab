from __future__ import annotations

import unittest

from app.modules.publications.length_targets import LengthTargetError, resolve_length_target


class PlatformLengthTargetsTestCase(unittest.TestCase):
    def test_current_post_wins_over_rubric_and_project(self) -> None:
        resolved = resolve_length_target(
            "telegram",
            {"telegram": {"min_chars": 900, "max_chars": 1200}},
            {"length_targets": {"telegram": {"min_chars": 1500, "max_chars": 1900}}},
            {"platform_targets": {"telegram": {"min_chars": 2000, "max_chars": 2500}}},
        )

        self.assertEqual(resolved.source, "post")
        self.assertEqual((resolved.min_chars, resolved.max_chars), (900, 1200))

    def test_rubric_wins_and_project_is_used_without_rubric_target(self) -> None:
        rubric = resolve_length_target(
            "vk",
            {},
            {"length_targets": {"vk": {"min_chars": 1300, "max_chars": 1700}}},
            {"platform_targets": {"vk": {"min_chars": 2100, "max_chars": 2600}}},
        )
        project = resolve_length_target(
            "vk",
            {},
            {},
            {"platform_targets": {"vk": {"min_chars": 2100, "max_chars": 2600}}},
        )

        self.assertEqual(rubric.source, "rubric")
        self.assertEqual(project.source, "project")

    def test_inherited_unsafe_max_is_clamped_but_post_override_is_rejected(self) -> None:
        inherited = resolve_length_target(
            "max",
            {},
            {},
            {"platform_targets": {"max": {"min_chars": 3500, "max_chars": 5000}}},
        )

        self.assertEqual(inherited.max_chars, 4000)
        with self.assertRaises(LengthTargetError):
            resolve_length_target(
                "max",
                {"max": {"min_chars": 3500, "max_chars": 5000}},
                {},
                {},
            )

    def test_invalid_range_is_rejected(self) -> None:
        with self.assertRaises(LengthTargetError):
            resolve_length_target(
                "telegram",
                {"telegram": {"min_chars": 2000, "max_chars": 1000}},
                {},
                {},
            )


if __name__ == "__main__":
    unittest.main()

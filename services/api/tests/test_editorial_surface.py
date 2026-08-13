from __future__ import annotations

import copy
import sys
import unittest
from pathlib import Path

BASE = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(BASE / "services" / "api"))

from app.modules.ai.editorial_surface import (  # noqa: E402
    compact_generated_editorial_paragraphs,
    generated_editorial_findings,
    normalize_generated_editorial_payload,
    normalize_generated_editorial_text,
    validate_generated_editorial_payload,
)


class EditorialSurfaceTest(unittest.TestCase):
    def assert_finding_code(self, text: str, code: str) -> None:
        findings = generated_editorial_findings(text)

        self.assertTrue(all(isinstance(finding, dict) for finding in findings))
        self.assertIn(code, {finding.get("code") for finding in findings})

    def test_normalizes_generated_prose_whitespace(self) -> None:
        source = (
            "\r\n\tПервый\u00a0  абзац.  \r\n"
            " \r\n\r\n"
            "Второй\tабзац.   \r\n"
        )

        self.assertEqual(
            normalize_generated_editorial_text(source),
            "Первый абзац.\n\nВторой абзац.",
        )

    def test_normalization_is_idempotent(self) -> None:
        source = "  Первый\t текст.\r\n\r\n\r\nВторой\u00a0 текст.  "

        normalized = normalize_generated_editorial_text(source)

        self.assertEqual(normalize_generated_editorial_text(normalized), normalized)

    def test_preserves_protected_and_structural_markdown(self) -> None:
        source = (
            "Ссылка: https://example.com/a--b?ref=one--two\n"
            "Почта: author--news@example.com\n"
            "Inline: `value  --flag`\n\n"
            "Double inline: ``value  --flag и `literal` ``\n\n"
            "```bash\n"
            "printf 'a  b'\n"
            "command --flag\n"
            "echo '——'\n"
            "```\n\n"
            "---\n\n"
            "| Поле | Значение |\n"
            "| :--- | ---: |\n"
            "| Формат | обычный |\n\n"
            "— Это реплика автора.\n"
            "- Это пункт списка."
        )

        self.assertEqual(normalize_generated_editorial_text(source), source)
        self.assertEqual(generated_editorial_findings(source), [])

    def test_rejects_repeated_prose_dashes(self) -> None:
        cases = (
            "Автор -- редактор своего текста.",
            "Автор –– редактор своего текста.",
            "Автор —— редактор своего текста.",
        )

        for text in cases:
            with self.subTest(text=text):
                self.assert_finding_code(text, "repeated_dash")

    def test_rejects_paired_internal_em_dashes(self) -> None:
        self.assert_finding_code(
            "Автор — и это принципиально — говорит своими словами.",
            "paired_em_dash",
        )

    def test_allows_one_necessary_dash_dialogue_and_list_markers(self) -> None:
        source = (
            "Автор — главный источник смысла.\n\n"
            "— Это мои слова, — сказал автор.\n\n"
            "— Я приду, — сказал он, — когда смогу.\n\n"
            "- Редактор помогает сохранить интонацию."
        )

        self.assertEqual(generated_editorial_findings(source), [])

    def test_short_prose_paragraphs_are_not_release_blocking(self) -> None:
        source = "\n\n".join(
            (
                "Первая короткая мысль.",
                "Вторая короткая мысль.",
                "Третья короткая мысль.",
                "Четвёртая короткая мысль.",
                "Пятая короткая мысль.",
                "Шестая короткая мысль.",
            )
        )

        self.assertEqual(generated_editorial_findings(source), [])

    def test_short_visual_lines_are_not_release_blocking(self) -> None:
        source = "\n".join(
            (
                "Первая короткая мысль.",
                "Вторая короткая мысль.",
                "Третья короткая мысль.",
                "Четвёртая короткая мысль.",
                "Пятая короткая мысль.",
                "Шестая короткая мысль.",
            )
        )

        self.assertEqual(generated_editorial_findings(source), [])

    def test_three_short_paragraphs_are_not_release_blocking(self) -> None:
        source = (
            "Это первая короткая мысль.\n\n"
            "Это вторая короткая мысль.\n\n"
            "Это третья короткая мысль."
        )

        self.assertEqual(generated_editorial_findings(source), [])

    def test_compacts_fragmented_model_prose_without_changing_words(self) -> None:
        source = (
            "Первая короткая мысль.\n\n"
            "Вторая короткая мысль.\n\n"
            "Третья короткая мысль.\n\n"
            "Четвёртая короткая мысль.\n\n"
            "Пятая короткая мысль."
        )

        repaired = compact_generated_editorial_paragraphs(source)

        self.assertEqual(
            repaired,
            "Первая короткая мысль. Вторая короткая мысль. Третья короткая мысль.\n\n"
            "Четвёртая короткая мысль. Пятая короткая мысль.",
        )
        self.assertEqual(generated_editorial_findings(repaired), [])
        self.assertEqual(
            repaired.replace("\n", " ").split(),
            source.replace("\n", " ").split(),
        )

    def test_compaction_preserves_lists_dialogue_links_and_code(self) -> None:
        source = (
            "Первая мысль.\n\nВторая мысль.\n\nТретья мысль.\n\n"
            "- Первый пункт.\n"
            "— Реплика автора.\n"
            "Ссылка: https://example.com/a--b\n"
            "```bash\ncommand --flag\n```"
        )

        repaired = compact_generated_editorial_paragraphs(source)

        self.assertIn("Первая мысль. Вторая мысль. Третья мысль.", repaired)
        self.assertIn("- Первый пункт.\n— Реплика автора.", repaired)
        self.assertIn("Ссылка: https://example.com/a--b", repaired)
        self.assertIn("```bash\ncommand --flag\n```", repaired)

    def test_allows_normal_connected_prose(self) -> None:
        source = (
            "Автор надиктовывает наблюдения и сам решает, что именно хочет сказать. "
            "Редактор помогает выстроить понятную композицию, сохраняя факты, лексику "
            "и естественный ритм речи.\n\n"
            "После редактуры автор видит цельный текст, проверяет смысл и вручную "
            "подтверждает публикацию. Никакие новые события, оценки или выводы модель "
            "за него не придумывает."
        )

        self.assertEqual(generated_editorial_findings(source), [])

    def test_normalizes_generated_payload_without_mutating_input(self) -> None:
        payload = {
            "master_text": "\tГлавный  текст.\r\n\r\n\r\nФинал.  ",
            "body_blocks": [
                {
                    "section": "lead",
                    "text": "  Первый\t блок.  ",
                    "source_keys": ["author_source"],
                },
                {
                    "section": "body",
                    "text": "Второй\u00a0  блок.",
                    "source_keys": ["author_source"],
                },
            ],
            "hook_candidates": [
                {"text": "  Первый  хук. ", "rank": 1, "source": "model"},
                {"text": "Второй\tхук.", "rank": 2, "source": "model"},
            ],
            "cta_candidate": "  Напишите\tнам. ",
            "text": "  Версия  для сети.\r\n",
            "warnings": ["  Служебное значение не меняется.  "],
        }
        original = copy.deepcopy(payload)

        normalized = normalize_generated_editorial_payload(payload)

        self.assertEqual(payload, original)
        self.assertIsNot(normalized, payload)
        self.assertEqual(normalized["master_text"], "Главный текст.\n\nФинал.")
        self.assertEqual(normalized["body_blocks"][0]["text"], "Первый блок.")
        self.assertEqual(normalized["body_blocks"][1]["text"], "Второй блок.")
        self.assertEqual(normalized["hook_candidates"][0]["text"], "Первый хук.")
        self.assertEqual(normalized["hook_candidates"][1]["text"], "Второй хук.")
        self.assertEqual(normalized["cta_candidate"], "Напишите нам.")
        self.assertEqual(normalized["text"], "Версия для сети.")
        self.assertEqual(normalized["warnings"], original["warnings"])

    def test_payload_validation_checks_each_generated_text_surface(self) -> None:
        payload = {
            "master_text": "Автор — коротко — объясняет замысел.",
            "body_blocks": [
                {"section": "body", "text": "Текст -- здесь.", "source_keys": []}
            ],
            "hook_candidates": [
                {"text": "Хук –– здесь.", "rank": 1, "source": "model"}
            ],
            "cta_candidate": "Скажите —— честно.",
            "text": "Чистая версия для площадки.",
        }

        findings = validate_generated_editorial_payload(payload)
        codes = {finding.get("code") for finding in findings}

        self.assertTrue(all(isinstance(finding, dict) for finding in findings))
        self.assertIn("repeated_dash", codes)
        self.assertIn("paired_em_dash", codes)


if __name__ == "__main__":
    unittest.main()

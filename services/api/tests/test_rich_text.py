from __future__ import annotations

import sys
import unittest
from pathlib import Path

BASE = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(BASE / "services" / "api"))

from app.modules.publications.rich_text import (  # noqa: E402
    RichTextValidationError,
    join_rich_text,
    normalize_rich_text,
    rich_text_html,
    rich_text_plain,
    strip_rich_text_suffix,
)
from app.modules.publications.connectors import (  # noqa: E402
    build_max_message_payload,
    build_telegram_rich_message_payload,
)


class RichTextTest(unittest.TestCase):
    def setUp(self) -> None:
        self.document = {
            "version": 1,
            "segments": [
                {"text": "Читайте ", "marks": []},
                {
                    "text": "другие обзоры",
                    "marks": [{"type": "link", "href": "https://example.com/review"}],
                },
                {"text": "!", "marks": [{"type": "bold"}]},
            ],
        }

    def test_normalizes_and_derives_plain_text(self) -> None:
        normalized = normalize_rich_text(self.document)

        self.assertEqual(rich_text_plain(normalized), "Читайте другие обзоры!")
        self.assertEqual(normalized["version"], 1)

    def test_rejects_unsafe_link_scheme(self) -> None:
        document = {
            "version": 1,
            "segments": [
                {"text": "опасно", "marks": [{"type": "link", "href": "javascript:alert(1)"}]}
            ],
        }

        with self.assertRaises(RichTextValidationError):
            normalize_rich_text(document)

    def test_html_is_escaped_and_keeps_safe_link(self) -> None:
        document = {
            "version": 1,
            "segments": [
                {"text": "<b>не тег</b>\n", "marks": []},
                {
                    "text": "ссылка",
                    "marks": [{"type": "italic"}, {"type": "link", "href": "https://example.com/?a=1&b=2"}],
                },
            ],
        }

        rendered = rich_text_html(document)

        self.assertIn("&lt;b&gt;не тег&lt;/b&gt;<br>", rendered)
        self.assertIn('<a href="https://example.com/?a=1&amp;b=2"><em>ссылка</em></a>', rendered)

    def test_join_and_strip_footer_preserve_body_marks(self) -> None:
        body = {
            "version": 1,
            "segments": [{"text": "Основной текст", "marks": [{"type": "bold"}]}],
        }
        footer = normalize_rich_text(self.document)
        complete = join_rich_text(body, footer)

        stripped = strip_rich_text_suffix(complete, rich_text_plain(footer))

        self.assertEqual(rich_text_plain(complete), "Основной текст\n\nЧитайте другие обзоры!")
        self.assertEqual(stripped, normalize_rich_text(body))

    def test_telegram_and_max_payloads_render_embedded_links(self) -> None:
        telegram = build_telegram_rich_message_payload(
            publication_id="publication",
            destination_id="destination",
            text="Читайте другие обзоры!",
            rich_text=self.document,
            configuration={"chat_id": "-100123"},
            idempotency_key="rich-links",
        )
        maximum = build_max_message_payload(
            publication_id="publication",
            destination_id="destination",
            text="Читайте другие обзоры!",
            rich_text=self.document,
            configuration={"chat_id": "123", "format": "html"},
            idempotency_key="rich-links",
        )

        self.assertIn('<a href="https://example.com/review">другие обзоры</a>', telegram["request"]["rich_message"]["html"])
        self.assertIn('<a href="https://example.com/review">другие обзоры</a>', maximum["request"]["body"]["text"])


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import copy
import re
from typing import Any


HORIZONTAL_SPACE_RE = re.compile(r"[ \t\u00a0\u2007\u202f]+")
INLINE_CODE_SPAN_RE = re.compile(
    r"(?P<ticks>`+)(?P<body>[^\n]*?)(?P=ticks)"
)
PROTECTED_INLINE_RE = re.compile(
    r"https?://\S+|www\.\S+|[\w.+-]+@[\w.-]+\.\w+",
    flags=re.IGNORECASE | re.UNICODE,
)
FENCE_RE = re.compile(r"^\s*(?:```|~~~)")
STRUCTURAL_LINE_RE = re.compile(
    r"^\s*(?:[-*+]\s+|—\s+|\d+[.)]\s+|>\s*|#{1,6}\s+|\|)",
    flags=re.UNICODE,
)

GENERATED_EDITORIAL_RULES_VERSION = "phase12l-author-voice-surface-v3"
MARKDOWN_DIVIDER_RE = re.compile(r"^\s*(?:[-*_]\s*){3,}$")
MARKDOWN_TABLE_SEPARATOR_RE = re.compile(
    r"^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*$"
)


GENERATED_EDITORIAL_PROMPT_RULES = " ".join(
    [
        "Слова, позиция, эмоциональность и личные выводы принадлежат автору.",
        "Работай как постоянный редактор: сохраняй характерные слова и ритм автора, "
        "меняй только необходимое для ясности, связности и площадки.",
        "Не дописывай от первого лица опыт, мнение, эмоцию, тезис или вывод, которых "
        "нет в авторском источнике.",
        "Примеры задают только манеру выражения, но не тему, факты, сюжет, метафору, "
        "цитату, CTA или личный опыт.",
        "В готовой прозе используй обычные одиночные пробелы.",
        "Не используй двойные тире или дефисы --, ––, —— и парные вставные конструкции "
        "вида — пояснение —; выбирай точку, запятую, скобки или естественную перестройку фразы.",
        "Одно тире, необходимое по правилам языка, допустимо.",
    ]
)


def _normalize_prose_line(line: str) -> str:
    if not line or not line.strip(" \t\u00a0\u2007\u202f"):
        return ""

    structural = STRUCTURAL_LINE_RE.match(line) is not None
    leading = ""
    body = line
    if structural:
        match = re.match(r"^[ \t]*", line)
        assert match is not None
        leading = match.group(0)
        body = line[len(leading) :]
    else:
        body = body.lstrip(" \t\u00a0\u2007\u202f")

    normalized_parts: list[str] = []
    cursor = 0
    for match in INLINE_CODE_SPAN_RE.finditer(body):
        normalized_parts.append(HORIZONTAL_SPACE_RE.sub(" ", body[cursor : match.start()]))
        normalized_parts.append(match.group(0))
        cursor = match.end()
    normalized_parts.append(HORIZONTAL_SPACE_RE.sub(" ", body[cursor:]))
    return f"{leading}{''.join(normalized_parts)}".rstrip(
        " \t\u00a0\u2007\u202f"
    )


def normalize_generated_editorial_text(value: str) -> str:
    """Normalize lossless surface defects in model-generated prose only.

    Callers must never use this helper for stored dictation, user edits, imported
    examples, rich text, or fixed boilerplate.
    """

    lines = value.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    output: list[str] = []
    in_fence = False
    pending_blank = False

    for raw_line in lines:
        is_fence = FENCE_RE.match(raw_line) is not None
        if in_fence:
            output.append(raw_line)
            if is_fence:
                in_fence = False
            continue
        if is_fence:
            if pending_blank and output:
                output.append("")
            pending_blank = False
            output.append(raw_line)
            in_fence = True
            continue

        line = _normalize_prose_line(raw_line)
        if not line:
            pending_blank = True
            continue
        if pending_blank and output:
            output.append("")
        pending_blank = False
        output.append(line)

    while output and not output[0]:
        output.pop(0)
    while output and not output[-1]:
        output.pop()
    return "\n".join(output)


def _mask_protected_inline(value: str) -> str:
    masked = list(value)
    for pattern in (INLINE_CODE_SPAN_RE, PROTECTED_INLINE_RE):
        for match in pattern.finditer(value):
            masked[match.start() : match.end()] = " " * len(match.group(0))
    return "".join(masked)


def _surface_prose_lines(value: str) -> list[str | None]:
    lines: list[str | None] = []
    in_fence = False
    for line in value.split("\n"):
        is_fence = FENCE_RE.match(line) is not None
        if in_fence:
            lines.append(None)
            if is_fence:
                in_fence = False
            continue
        if is_fence:
            lines.append(None)
            in_fence = True
            continue
        if MARKDOWN_DIVIDER_RE.match(line) or MARKDOWN_TABLE_SEPARATOR_RE.match(line):
            lines.append(None)
            continue
        lines.append(_mask_protected_inline(line))
    return lines


def generated_editorial_findings(value: str) -> list[dict[str, str]]:
    normalized = normalize_generated_editorial_text(value)
    findings: list[dict[str, str]] = []
    prose_lines = _surface_prose_lines(normalized)

    if any(
        line is not None and re.search(r"--|––|——", line)
        for line in prose_lines
    ):
        findings.append(
            {
                "code": "repeated_dash",
                "message": "Сгенерированный текст содержит двойное тире или дефис.",
                "field": "generated_text",
            }
        )

    paired_dash = False
    for line in prose_lines:
        if line is None:
            continue
        if re.match(r"^\s*—\s+", line):
            continue
        candidate = line
        for sentence in re.split(r"(?<=[.!?…])\s+", candidate):
            if len(re.findall(r"(?<=\S)\s+—\s+(?=\S)", sentence)) >= 2:
                paired_dash = True
                break
        if paired_dash:
            break
    if paired_dash:
        findings.append(
            {
                "code": "paired_em_dash",
                "message": "Сгенерированный текст содержит парную вставку через тире.",
                "field": "generated_text",
            }
        )

    return findings


def normalize_generated_editorial_payload(payload: dict[str, Any]) -> dict[str, Any]:
    normalized = copy.deepcopy(payload)
    for key in ("master_text", "text", "cta_candidate"):
        if isinstance(normalized.get(key), str):
            normalized[key] = normalize_generated_editorial_text(normalized[key])
    for collection_key in ("body_blocks", "hook_candidates"):
        collection = normalized.get(collection_key)
        if not isinstance(collection, list):
            continue
        for item in collection:
            if isinstance(item, dict) and isinstance(item.get("text"), str):
                item["text"] = normalize_generated_editorial_text(item["text"])
    return normalized


def validate_generated_editorial_payload(
    payload: dict[str, Any],
) -> list[dict[str, str]]:
    fields: list[tuple[str, str]] = []
    for key in ("master_text", "text", "cta_candidate"):
        if isinstance(payload.get(key), str):
            fields.append((key, payload[key]))
    for collection_key in ("body_blocks", "hook_candidates"):
        collection = payload.get(collection_key)
        if not isinstance(collection, list):
            continue
        for index, item in enumerate(collection):
            if isinstance(item, dict) and isinstance(item.get("text"), str):
                fields.append((f"{collection_key}[{index}].text", item["text"]))

    findings: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for field, text in fields:
        for finding in generated_editorial_findings(text):
            key = (field, finding["code"])
            if key in seen:
                continue
            seen.add(key)
            findings.append({**finding, "field": field})
    return findings

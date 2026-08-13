from __future__ import annotations

import copy
import math
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

GENERATED_EDITORIAL_RULES_VERSION = "phase12k-author-voice-surface-v2"
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
        "В готовой прозе используй обычные одиночные пробелы и не больше одной пустой "
        "строки между настоящими абзацами.",
        "Не дроби связанную мысль на цепочку коротких однофразных абзацев.",
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


def _paragraph_fragmentation(value: str) -> bool:
    lines = value.split("\n")
    prose_runs: list[list[str]] = [[]]
    in_fence = False
    for line in lines:
        is_fence = FENCE_RE.match(line) is not None
        if in_fence:
            if is_fence:
                in_fence = False
            if prose_runs[-1]:
                prose_runs.append([])
            continue
        if is_fence:
            in_fence = True
            if prose_runs[-1]:
                prose_runs.append([])
            continue
        if not line.strip():
            continue
        if (
            STRUCTURAL_LINE_RE.match(line)
            or MARKDOWN_DIVIDER_RE.match(line)
            or MARKDOWN_TABLE_SEPARATOR_RE.match(line)
            or INLINE_CODE_SPAN_RE.search(line)
            or PROTECTED_INLINE_RE.search(line)
        ):
            if prose_runs[-1]:
                prose_runs.append([])
            continue
        prose_runs[-1].append(line.strip())

    for run in prose_runs:
        if not run:
            continue
        very_short_streak = 0
        for paragraph in run:
            sentence_marks = len(re.findall(r"[.!?…]+(?=\s|$)", paragraph))
            is_single_sentence = sentence_marks <= 1
            if len(paragraph) <= 80 and is_single_sentence:
                very_short_streak += 1
                if very_short_streak >= 3:
                    return True
            else:
                very_short_streak = 0
        short_count = sum(
            len(paragraph) <= 120
            and len(re.findall(r"[.!?…]+(?=\s|$)", paragraph)) <= 1
            for paragraph in run
        )
        if len(run) >= 6 and short_count >= math.ceil(len(run) * 2 / 3):
            return True
    return False


def _short_single_sentence_prose(line: str) -> bool:
    return (
        len(line) <= 180
        and len(re.findall(r"[.!?…]+(?=\s|$)", line)) <= 1
        and STRUCTURAL_LINE_RE.match(line) is None
        and MARKDOWN_DIVIDER_RE.match(line) is None
        and MARKDOWN_TABLE_SEPARATOR_RE.match(line) is None
        and INLINE_CODE_SPAN_RE.search(line) is None
        and PROTECTED_INLINE_RE.search(line) is None
    )


def compact_generated_editorial_paragraphs(value: str) -> str:
    """Repair only paragraph boundaries in generated prose.

    Three or more consecutive short one-sentence model paragraphs are merged
    into two- or three-sentence paragraphs. Words and punctuation are kept
    byte-for-byte; user-authored text never passes through this helper.
    """

    normalized = normalize_generated_editorial_text(value)
    if not _paragraph_fragmentation(normalized):
        return normalized

    output: list[str] = []
    prose_run: list[tuple[str, bool]] = []
    pending_blank = False
    in_fence = False

    def append_line(line: str, blank_before: bool) -> None:
        if blank_before and output and output[-1] != "":
            output.append("")
        output.append(line)

    def flush_prose_run() -> None:
        nonlocal prose_run
        index = 0
        while index < len(prose_run):
            line, blank_before = prose_run[index]
            if not _short_single_sentence_prose(line):
                append_line(line, blank_before)
                index += 1
                continue
            end = index
            while end < len(prose_run) and _short_single_sentence_prose(prose_run[end][0]):
                end += 1
            streak = prose_run[index:end]
            if len(streak) < 3:
                for streak_line, streak_blank in streak:
                    append_line(streak_line, streak_blank)
            else:
                offset = 0
                first_group = True
                while offset < len(streak):
                    remaining = len(streak) - offset
                    group_size = 3 if remaining % 2 == 1 else 2
                    group = streak[offset : offset + group_size]
                    append_line(
                        " ".join(part[0] for part in group),
                        group[0][1] if first_group else True,
                    )
                    first_group = False
                    offset += group_size
            index = end
        prose_run = []

    for line in normalized.split("\n"):
        is_fence = FENCE_RE.match(line) is not None
        protected = (
            in_fence
            or is_fence
            or STRUCTURAL_LINE_RE.match(line) is not None
            or MARKDOWN_DIVIDER_RE.match(line) is not None
            or MARKDOWN_TABLE_SEPARATOR_RE.match(line) is not None
            or INLINE_CODE_SPAN_RE.search(line) is not None
            or PROTECTED_INLINE_RE.search(line) is not None
        )
        if not line:
            pending_blank = True
            continue
        if protected:
            flush_prose_run()
            append_line(line, pending_blank)
            pending_blank = False
            if is_fence:
                in_fence = not in_fence
            continue
        prose_run.append((line, pending_blank))
        pending_blank = False

    flush_prose_run()
    return "\n".join(output).strip()


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
            normalized[key] = compact_generated_editorial_paragraphs(normalized[key])
    for collection_key in ("body_blocks", "hook_candidates"):
        collection = normalized.get(collection_key)
        if not isinstance(collection, list):
            continue
        for item in collection:
            if isinstance(item, dict) and isinstance(item.get("text"), str):
                item["text"] = compact_generated_editorial_paragraphs(item["text"])
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

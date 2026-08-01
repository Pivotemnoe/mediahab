from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from app.modules.publications.connectors import capability_for


SYSTEM_TARGETS: dict[str, tuple[int, int]] = {
    "telegram": (1800, 2500),
    "max": (1800, 2500),
    "vk": (1800, 2500),
    "instagram": (1000, 1800),
}


class LengthTargetError(ValueError):
    pass


@dataclass(frozen=True)
class ResolvedLengthTarget:
    min_chars: int | None
    max_chars: int | None
    hard_max_chars: int
    source: str

    def as_payload(self) -> dict[str, Any]:
        return asdict(self)


def _target_from(container: object, key: str, platform_key: str) -> object:
    if not isinstance(container, dict):
        return None
    targets = container.get(key)
    return targets.get(platform_key) if isinstance(targets, dict) else None


def _normalize_target(value: object, *, strict: bool, hard_max: int) -> tuple[int | None, int | None] | None:
    if not isinstance(value, dict):
        return None
    raw_min = value.get("min_chars")
    raw_max = value.get("max_chars")
    try:
        min_chars = int(raw_min) if raw_min not in (None, "") else None
        max_chars = int(raw_max) if raw_max not in (None, "") else None
    except (TypeError, ValueError) as exc:
        raise LengthTargetError("Length target bounds must be integers.") from exc
    if min_chars is None and max_chars is None:
        return None
    if min_chars is not None and min_chars < 1:
        raise LengthTargetError("Length target minimum must be positive.")
    if max_chars is not None and max_chars < 1:
        raise LengthTargetError("Length target maximum must be positive.")
    if min_chars is not None and max_chars is not None and min_chars > max_chars:
        raise LengthTargetError("Length target minimum cannot exceed its maximum.")
    if strict and ((min_chars or 0) > hard_max or (max_chars or 0) > hard_max):
        raise LengthTargetError(f"Length target cannot exceed the platform hard limit of {hard_max}.")
    min_chars = min(min_chars, hard_max) if min_chars is not None else None
    max_chars = min(max_chars, hard_max) if max_chars is not None else None
    return min_chars, max_chars


def resolve_length_target(
    platform_key: str,
    current_overrides: object,
    rubric_overrides: object,
    project_policy: object,
) -> ResolvedLengthTarget:
    hard_max = capability_for(platform_key).hard_text_limit
    candidates = (
        ("post", _target_from({"length_targets": current_overrides}, "length_targets", platform_key), True),
        ("rubric", _target_from(rubric_overrides, "length_targets", platform_key), False),
        ("project", _target_from(project_policy, "platform_targets", platform_key), False),
    )
    for source, value, strict in candidates:
        normalized = _normalize_target(value, strict=strict, hard_max=hard_max)
        if normalized is not None:
            return ResolvedLengthTarget(*normalized, hard_max_chars=hard_max, source=source)
    system_min, system_max = SYSTEM_TARGETS.get(platform_key, (None, None))
    system_max = min(system_max, hard_max) if system_max is not None else None
    system_min = min(system_min, system_max) if system_min is not None and system_max is not None else system_min
    return ResolvedLengthTarget(system_min, system_max, hard_max, "system")

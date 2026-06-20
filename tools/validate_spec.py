#!/usr/bin/env python3
"""Validate the specification package before handing it to Codex.

Dependencies: PyYAML and jsonschema. This script validates syntax, selected
schemas, the Telegram regression fixture, required files, and regenerates the
manifest plus validation report.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import yaml
from jsonschema import Draft202012Validator

BASE = Path(__file__).resolve().parents[1]
EXCLUDED_DIRS = {
    ".git",
    ".mypy_cache",
    ".next",
    ".pnpm-store",
    ".pytest_cache",
    ".ruff_cache",
    ".venv",
    "__pycache__",
    "build",
    "coverage",
    "dist",
    "minio-data",
    "node_modules",
    "postgres-data",
    "redis-data",
}
EXCLUDED_SUFFIXES = {".pyc", ".pyo", ".tsbuildinfo"}
EXCLUDED_FILENAMES = {".DS_Store"}
EXCLUDED_MANIFEST_FILES = {"SPEC_MANIFEST.json", "reference/VALIDATION_REPORT.md"}


def should_skip(path: Path) -> bool:
    relative = path.relative_to(BASE)
    if any(part in EXCLUDED_DIRS for part in relative.parts):
        return True
    if path.name in EXCLUDED_FILENAMES:
        return True
    if path.suffix in EXCLUDED_SUFFIXES:
        return True
    return False


def load_json(relative_path: str) -> object:
    return json.loads((BASE / relative_path).read_text(encoding="utf-8"))


def main() -> int:
    errors: list[str] = []
    checks: list[tuple[str, str, str]] = []

    for path in sorted(item for item in BASE.rglob("*.json") if not should_skip(item)):
        try:
            json.loads(path.read_text(encoding="utf-8"))
            checks.append((str(path.relative_to(BASE)), "JSON parse", "PASS"))
        except Exception as exc:  # pragma: no cover - CLI diagnostics
            errors.append(f"{path.relative_to(BASE)} JSON: {exc}")

    yaml_files = [
        item
        for item in list(BASE.rglob("*.yaml")) + list(BASE.rglob("*.yml"))
        if not should_skip(item)
    ]
    for path in sorted(yaml_files):
        try:
            yaml.safe_load(path.read_text(encoding="utf-8"))
            checks.append((str(path.relative_to(BASE)), "YAML parse", "PASS"))
        except Exception as exc:  # pragma: no cover - CLI diagnostics
            errors.append(f"{path.relative_to(BASE)} YAML: {exc}")

    def validate(instance: object, schema_rel: str, label: str) -> None:
        validator = Draft202012Validator(load_json(schema_rel))
        validation_errors = sorted(
            validator.iter_errors(instance), key=lambda err: list(err.path)
        )
        if validation_errors:
            for error in validation_errors:
                errors.append(f"{label}: {list(error.path)}: {error.message}")
        else:
            checks.append((label, f"validates against {schema_rel}", "PASS"))

    project = yaml.safe_load(
        (BASE / "presets/chto-poest-armavir/project.yaml").read_text(encoding="utf-8")
    )
    validate(project, "schemas/project.schema.json", "preset project")

    rubric_file = yaml.safe_load(
        (BASE / "presets/chto-poest-armavir/rubrics.yaml").read_text(encoding="utf-8")
    )
    for rubric in rubric_file["rubrics"]:
        validate(
            {"schema_version": "1.0", **rubric},
            "schemas/rubric.schema.json",
            f"rubric:{rubric['key']}",
        )

    for path in sorted((BASE / "platform-policies").glob("*.yaml")):
        validate(
            yaml.safe_load(path.read_text(encoding="utf-8")),
            "schemas/platform-policy.schema.json",
            str(path.relative_to(BASE)),
        )

    validate(
        load_json("fixtures/example-import-template.json"),
        "schemas/example-import.schema.json",
        "example import fixture",
    )

    fixture = load_json("fixtures/telegram-donika.json")
    actual_count = len(fixture["text"])
    expected_count = fixture["expected_platform_count"]
    if actual_count != expected_count:
        errors.append(
            f"Telegram fixture character count {actual_count} != {expected_count}"
        )
    else:
        checks.append(
            ("fixtures/telegram-donika.json", "Unicode code-point count = 4069", "PASS")
        )

    media = fixture["media"]
    if media["total_items"] != media["images"] + media["videos"]:
        errors.append("Telegram fixture media total mismatch")
    else:
        checks.append(
            ("fixtures/telegram-donika.json", "7 images + 3 videos = 10", "PASS")
        )

    required = [
        "AGENTS.md",
        "README.md",
        "README_RU.md",
        "docs/en/MASTER_SPEC.md",
        "docs/ru/MASTER_SPEC.md",
        "codex/00_START_HERE_EN.md",
        "codex/00_START_HERE_RU.md",
        "reference/OFFICIAL_SOURCES.md",
        "plans/PHASE_00_DISCOVERY_AND_SPIKES.md",
        "platform-policies/telegram.yaml",
        "presets/chto-poest-armavir/rubrics.yaml",
        "schemas/rubric.schema.json",
    ]
    for relative_path in required:
        if not (BASE / relative_path).is_file():
            errors.append(f"Missing required file: {relative_path}")
        else:
            checks.append((relative_path, "required file exists", "PASS"))

    manifest_files = []
    for path in sorted(item for item in BASE.rglob("*") if item.is_file()):
        relative_path = str(path.relative_to(BASE))
        if relative_path in EXCLUDED_MANIFEST_FILES or should_skip(path):
            continue
        data = path.read_bytes()
        manifest_files.append(
            {
                "path": relative_path,
                "size_bytes": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
            }
        )

    now = datetime.now(timezone.utc).isoformat()
    manifest = {
        "specification": "Temichev Media Hub Codex package",
        "version": "1.0.0",
        "generated_at": now,
        "canonical_language": "en",
        "file_count": len(manifest_files),
        "files": manifest_files,
        "validation_status": "PASS" if not errors else "FAIL",
    }
    (BASE / "SPEC_MANIFEST.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    report_lines = [
        "# Specification package validation report",
        "",
        f"**Status:** {'PASS' if not errors else 'FAIL'}",
        f"**Validated:** {now}",
        "",
        f"Checks passed: {len(checks)}",
        f"Errors: {len(errors)}",
        "",
    ]
    if errors:
        report_lines.extend(["## Errors", ""])
        report_lines.extend(f"- {error}" for error in errors)
        report_lines.append("")
    report_lines.extend(["## Key checks", ""])
    report_lines.extend(
        f"- PASS — `{path}`: {description}" for path, description, _ in checks
    )
    (BASE / "reference/VALIDATION_REPORT.md").write_text(
        "\n".join(report_lines) + "\n", encoding="utf-8"
    )

    print("PASS" if not errors else "FAIL")
    print(f"checks={len(checks)} files={len(manifest_files)} errors={len(errors)}")
    for error in errors:
        print(f"ERROR: {error}")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())

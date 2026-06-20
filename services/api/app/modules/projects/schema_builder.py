from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import yaml
from jsonschema import Draft202012Validator

BASE = Path(__file__).resolve().parents[5]


FIELD_TYPE_TO_JSON: dict[str, dict[str, Any]] = {
    "short_text": {"type": "string", "maxLength": 500},
    "long_text": {"type": "string"},
    "voice": {"type": "string", "contentMediaType": "audio/*"},
    "voice_or_long_text": {"type": "string"},
    "number": {"type": "number"},
    "money": {"type": "number", "minimum": 0},
    "date_time": {"type": "string", "format": "date-time"},
    "address": {"type": "string"},
    "select": {"type": "string"},
    "multi_select": {"type": "array", "items": {"type": "string"}},
    "boolean": {"type": "boolean"},
    "rating": {"type": "integer", "minimum": 0, "maximum": 9},
    "media_picker": {"type": "array", "items": {"type": "string", "format": "uuid"}},
    "custom_block": {"type": "object", "additionalProperties": True},
}


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def checksum(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def load_yaml(relative_path: str) -> dict[str, Any]:
    return yaml.safe_load((BASE / relative_path).read_text(encoding="utf-8"))


def load_json(relative_path: str) -> dict[str, Any]:
    return json.loads((BASE / relative_path).read_text(encoding="utf-8"))


def validate_project_payload(payload: dict[str, Any]) -> list[str]:
    return validate_against_schema(payload, "schemas/project.schema.json")


def validate_rubric_payload(payload: dict[str, Any]) -> list[str]:
    return validate_against_schema(payload, "schemas/rubric.schema.json")


def validate_against_schema(payload: dict[str, Any], schema_path: str) -> list[str]:
    validator = Draft202012Validator(load_json(schema_path))
    errors = sorted(validator.iter_errors(payload), key=lambda err: list(err.path))
    return [f"{list(error.path)}: {error.message}" for error in errors]


def input_flow_to_schema(
    rubric_key: str,
    input_flow: list[dict[str, Any]] | None,
    template: str | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    if not input_flow:
        json_schema = {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "type": "object",
            "title": rubric_key,
            "x-input-flow-template": template,
            "properties": {
                "notes": {
                    "type": "string",
                    "title": "Source notes",
                    "description": f"Template-backed input flow: {template or 'custom'}",
                }
            },
            "required": [],
            "additionalProperties": True,
        }
        ui_schema = {
            "order": ["notes"],
            "template": template,
            "fields": [{"key": "notes", "label": "Source notes", "type": "long_text"}],
        }
        return json_schema, ui_schema

    properties: dict[str, Any] = {}
    required: list[str] = []
    ui_fields: list[dict[str, Any]] = []
    for index, field in enumerate(input_flow):
        key = field["key"]
        properties[key] = field_to_json_schema(field)
        if field.get("required"):
            required.append(key)
        ui_fields.append(
            {
                "key": key,
                "label": field.get("label", key),
                "type": field.get("type"),
                "order": index,
                "source": field.get("source", "user_input"),
                "fact_locked": bool(field.get("fact_locked", False)),
                "repeatable": bool(
                    field.get("repeatable", False)
                    or field.get("type") == "repeatable_group"
                ),
                "fields": field.get("fields", []),
            }
        )

    json_schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "title": rubric_key,
        "properties": properties,
        "required": required,
        "additionalProperties": False,
    }
    ui_schema = {
        "order": [field["key"] for field in input_flow],
        "fields": ui_fields,
        "template": template,
    }
    return json_schema, ui_schema


def field_to_json_schema(field: dict[str, Any]) -> dict[str, Any]:
    field_type = field.get("type")
    if field_type == "object":
        nested = input_flow_to_schema(field["key"], field.get("fields", []))[0]
        return {
            "type": "object",
            "title": field.get("label", field["key"]),
            "properties": nested["properties"],
            "required": nested["required"],
            "additionalProperties": False,
        }
    if field_type == "repeatable_group":
        nested = input_flow_to_schema(field["key"], field.get("fields", []))[0]
        schema = {
            "type": "array",
            "title": field.get("label", field["key"]),
            "items": {
                "type": "object",
                "properties": nested["properties"],
                "required": nested["required"],
                "additionalProperties": False,
            },
        }
        if field.get("min_items") is not None:
            schema["minItems"] = field["min_items"]
        if field.get("max_items") is not None:
            schema["maxItems"] = field["max_items"]
        return schema
    schema = dict(FIELD_TYPE_TO_JSON.get(field_type, {"type": "string"}))
    schema["title"] = field.get("label", field.get("key"))
    if field.get("description"):
        schema["description"] = field["description"]
    if field.get("validation"):
        schema.update(field["validation"])
    return schema

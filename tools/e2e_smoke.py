#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]


def main() -> int:
    web_package = BASE / "apps" / "web" / "package.json"
    api_main = BASE / "services" / "api" / "app" / "main.py"
    openapi = BASE / "packages" / "contracts" / "openapi" / "openapi.json"

    missing = [path for path in [web_package, api_main, openapi] if not path.exists()]
    if missing:
        for path in missing:
            print(f"missing: {path.relative_to(BASE)}")
        return 1

    schema = json.loads(openapi.read_text(encoding="utf-8"))
    paths = schema.get("paths", {})
    required_paths = {
        "/api/v1/health/live",
        "/api/v1/health/ready",
        "/api/v1/auth/register",
        "/api/v1/auth/login",
        "/api/v1/me",
        "/api/v1/me/sessions",
        "/api/v1/workspaces",
        "/api/v1/plans",
        "/api/v1/workspaces/{workspace_id}/subscription",
        "/api/v1/workspaces/{workspace_id}/checkout",
        "/api/v1/workspaces/{workspace_id}/projects",
        "/api/v1/workspaces/{workspace_id}/projects/from-preset",
        "/api/v1/projects/{project_id}",
        "/api/v1/projects/{project_id}/rubrics",
        "/api/v1/rubrics/{rubric_id}/form-schema",
        "/api/v1/projects/{project_id}/content-items",
        "/api/v1/content-items/{content_id}",
        "/api/v1/content-items/{content_id}/guided-form",
        "/api/v1/content-items/{content_id}/blocks",
        "/api/v1/content-items/{content_id}/repeatable-groups/{group_key}",
        "/api/v1/content-blocks/{block_id}",
        "/api/v1/content-blocks/{block_id}/lock",
        "/api/v1/content-blocks/{block_id}/unlock",
        "/api/v1/media/presign-upload",
        "/api/v1/media/{media_id}/complete-upload",
        "/api/v1/content-items/{content_id}/media-order",
        "/api/v1/content-blocks/{block_id}/transcribe",
        "/api/v1/transcription-jobs/{job_id}",
        "/api/v1/transcription-jobs/{job_id}/accept",
        "/api/v1/projects/{project_id}/examples",
        "/api/v1/projects/{project_id}/examples/import",
        "/api/v1/examples/{example_id}",
        "/api/v1/examples/{example_id}/approve",
        "/api/v1/examples/{example_id}/reject",
        "/api/v1/content-items/{content_id}/extract-facts",
        "/api/v1/content-items/{content_id}/assemble-master",
        "/api/v1/content-items/{content_id}/suggest-hook",
        "/api/v1/content-items/{content_id}/suggest-ratings",
        "/api/v1/content-items/{content_id}/quality-check",
        "/api/v1/ai-runs/{run_id}",
        "/api/v1/ai-runs/{run_id}/cancel",
        "/api/v1/ai-runs/{run_id}/retry",
        "/api/v1/content-items/{content_id}/generate-variants",
        "/api/v1/content-items/{content_id}/variants",
        "/api/v1/platform-variants/{variant_id}",
        "/api/v1/platform-variants/{variant_id}/validate",
        "/api/v1/platform-variants/{variant_id}/approve",
        "/api/v1/projects/{project_id}/destinations",
        "/api/v1/destinations/{destination_id}",
        "/api/v1/destinations/{destination_id}/capabilities",
        "/api/v1/destinations/{destination_id}/test",
        "/api/v1/platform-variants/{variant_id}/publications",
        "/api/v1/publications",
        "/api/v1/publications/{publication_id}",
        "/api/v1/publications/{publication_id}/schedule",
        "/api/v1/publications/{publication_id}/publish-now",
        "/api/v1/publications/{publication_id}/cancel",
        "/api/v1/publications/{publication_id}/retry",
        "/api/v1/publications/{publication_id}/refresh-status",
        "/api/v1/publications/{publication_id}/edit",
        "/api/v1/publications/{publication_id}/external-post",
        "/api/v1/publications/{publication_id}/confirm-manual",
        "/api/v1/publications/{publication_id}/attempts",
        "/api/v1/webhooks/generic/{destination_id}",
        "/api/v1/webhooks/max/{destination_id}",
    }
    missing_paths = sorted(required_paths - set(paths))
    if missing_paths:
        for path in missing_paths:
            print(f"missing openapi path: {path}")
        return 1

    print("Phase 06 smoke passed: publication core OpenAPI paths are present.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

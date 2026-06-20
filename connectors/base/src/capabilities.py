from __future__ import annotations

from pydantic import BaseModel


class CapabilitySet(BaseModel):
    platform_key: str
    source: str
    documented: dict[str, object]
    live_tested: dict[str, object] = {}

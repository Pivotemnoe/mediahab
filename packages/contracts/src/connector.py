from __future__ import annotations

from typing import Any, Protocol


class PlatformConnector(Protocol):
    key: str

    async def capabilities(self, account: Any | None) -> dict[str, Any]: ...

    async def validate(self, variant: Any, destination: Any) -> dict[str, Any]: ...

    async def prepare_media(self, publication: Any) -> dict[str, Any]: ...

    async def publish(self, publication: Any, prepared: Any) -> dict[str, Any]: ...

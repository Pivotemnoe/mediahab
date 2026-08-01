from __future__ import annotations

import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

from sqlalchemy.dialects import postgresql

BASE = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(BASE / "services" / "api"))

from app.modules.publications.connectors import all_capabilities  # noqa: E402
from app.modules.publications.service import ensure_publication_catalog  # noqa: E402


class PublicationCatalogConcurrencyTest(unittest.IsolatedAsyncioTestCase):
    async def test_postgres_catalog_initialization_uses_atomic_upserts(self) -> None:
        session = SimpleNamespace(
            add=Mock(),
            bind=SimpleNamespace(dialect=SimpleNamespace(name="postgresql")),
            execute=AsyncMock(),
            flush=AsyncMock(),
        )

        await ensure_publication_catalog(session)

        expected_statement_count = len(all_capabilities()) * 2
        self.assertEqual(session.execute.await_count, expected_statement_count)
        self.assertEqual(session.flush.await_count, 1)
        session.add.assert_not_called()

        statements = [call.args[0] for call in session.execute.await_args_list]
        compiled = [str(statement.compile(dialect=postgresql.dialect())) for statement in statements]
        self.assertTrue(all("ON CONFLICT" in statement for statement in compiled))


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Phase01Marker(Base):
    __tablename__ = "phase01_markers"

    key: Mapped[str] = mapped_column(primary_key=True)
    value: Mapped[str]

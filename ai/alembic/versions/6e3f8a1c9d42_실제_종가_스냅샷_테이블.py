"""실제 종가 스냅샷 테이블

Revision ID: 6e3f8a1c9d42
Revises: b4e8c7a2d1f6
Create Date: 2026-09-08
"""

from alembic import op
import sqlalchemy as sa

revision = "6e3f8a1c9d42"
down_revision = "b4e8c7a2d1f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "price_snapshot_daily",
        sa.Column("ticker", sa.String(length=6), nullable=False),
        sa.Column("trade_date", sa.Date(), nullable=False),
        sa.Column("close", sa.Integer(), nullable=False),
        sa.Column("volume", sa.BigInteger(), nullable=True),
        sa.Column("trade_value", sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(
            ["ticker"], ["instruments.ticker"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("ticker", "trade_date"),
    )
    op.create_index(
        "ix_price_snapshot_daily_date",
        "price_snapshot_daily",
        ["trade_date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_price_snapshot_daily_date", table_name="price_snapshot_daily"
    )
    op.drop_table("price_snapshot_daily")

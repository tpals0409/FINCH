"""청크 벡터 HNSW 인덱스 추가

운영 코퍼스 10,198개 청크의 무인덱스 검색 p95가 사전 기준을 넘었다. 같은 평가셋으로
속도와 Recall@5를 다시 비교할 수 있도록 코사인 거리 HNSW 인덱스를 추가한다.

Revision ID: b4e8c7a2d1f6
Revises: 9b4c1f6ad2e7
Create Date: 2026-09-07
"""

from alembic import op

revision = "b4e8c7a2d1f6"
down_revision = "9b4c1f6ad2e7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_document_chunks_embedding_hnsw",
        "document_chunks",
        ["embedding"],
        postgresql_using="hnsw",
        postgresql_with={"m": 16, "ef_construction": 64},
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )


def downgrade() -> None:
    op.drop_index("ix_document_chunks_embedding_hnsw", table_name="document_chunks")

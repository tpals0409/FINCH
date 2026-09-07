"""청크 벡터 HNSW 인덱스 추가

운영 코퍼스 10,198개 청크의 무인덱스 검색 지연을 줄일 후보로, 같은 평가셋에서
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
    # 운영 DB 기본값(64MB)에서는 그래프 빌드가 디스크 단계로 넘어갈 수 있다.
    # 이 Alembic 연결에만 256MB를 배정해 파드 기동 예산 안에서 인덱스를 만든다.
    op.execute("SET maintenance_work_mem = '256MB'")
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

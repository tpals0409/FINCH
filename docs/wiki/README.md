# FINCH 문서 지도

이 디렉터리는 원본 문서를 찾는 지도다. 계약, 정책, 설정값은 여기서 정의하지 않는다.
링크한 원본끼리 어긋나면 위키를 근거로 고르지 말고 각 문서의 소유자와 변경 이력을 확인한다.

미결정 사항을 찾으려면 먼저 [아직 안 정해진 것](./OPEN_QUESTIONS.md)을 본다.

## 먼저 찾을 곳

| 찾는 것 | 먼저 볼 원본 | 그 문서가 맡는 범위 |
|---|---|---|
| 제품 범위와 사용자 정책 | [기능 명세](../spec/featureSpec.md) | MVP와 확장 범위, 사용자에게 보이는 기능 정책 |
| Sprint 0 표기의 현재 해석 | [S0 결정 정리](../spec/s0-decisions.md) | 원래의 미결정 표와 이후 구현·결정 기록을 대조한 상태 |
| 프론트가 호출하는 백엔드 계약 | [백엔드 API 명세](../api/apiSpec.md) | 프론트·AI와 어긋날 때 기준이 되는 백엔드 API 계약 |
| 백엔드와 AI 사이의 방향 구분 | [AI 서비스 API 명세](../api/aiApiSpec.md) | AI가 제공하는 계약과 백엔드가 제공하는 내부 읽기 API의 경계 |
| AI 서버의 실제 스키마 | [AI OpenAPI](../../ai/docs/openapi.json) | AI 문서와 구현 스키마가 어긋날 때 우선하는 사실 |
| 크로스파트 계약의 확정 상태 | [프론트 계약 현황](../../frontend/docs/contracts.md) | 프론트가 의존하는 계약의 확정·잠정·미확정·충돌 상태 |
| 화면과 AI 기능의 배치 | [프론트 IA](../../frontend/docs/ia.md) | 화면 목록, 라우트, 화면별 데이터와 AI 슬롯 |
| 데이터 모델 | [백엔드 ERD](../erd/erd.md) | 백엔드 관계형 데이터 모델과 마이그레이션의 입력 |
| 디자인 체계의 구조와 이유 | [FINCH SEED](../design/finch-seed.md) | 토큰 값을 복사하지 않고 구조·사용 규칙·예외의 이유를 설명 |
| 배포와 운영 | [배포 런북](../ops/deploy-runbook.md) · [Pico 운영 브리핑](../ops/pico.md) | 배포 순서와 운영 진단 경계 |
| 과거 결정의 이유 | [ADR 색인](../adr/README.md) | 영구·토픽·스프린트 ADR의 분류와 보관 규칙 |

## 계약과 명세

- [기능 명세](../spec/featureSpec.md): 제품 기능, 정책, MVP와 확장 범위의 원본이다.
- [S0 결정 정리](../spec/s0-decisions.md): 기능 명세의 `S0-*` 표기를 현재 코드·명세와 대조한다. 제안과 확정을 문서 자체의 표기로 구분한다.
- [비밀값 인벤토리](../spec/secrets.md): 비밀값 자체가 아니라 필요한 키와 소유 경계를 기록한다.
- [백엔드 API 명세](../api/apiSpec.md): 공개 API와 AI용 내부 읽기 API의 백엔드 계약이다.
- [AI 서비스 API 명세](../api/aiApiSpec.md): AI 서비스가 백엔드에 제공하는 방향의 계약이다.
- [백엔드 ERD](../erd/erd.md): 백엔드 DB 스키마와 원장 관계의 설계 원본이다.

## 파트별 규약

- [Git 규약](../convention/gitConvention.md): 브랜치, 커밋, 리뷰 규칙이다.
- [백엔드 규약](../convention/backConvention.md): 백엔드 구현 규약이다. 현재 문서가 실제 규약으로 표시한 곳은 패키지 구조와 멱등성 절이며, 나머지 후반 절은 작성할 내용을 적은 목차다.
- [크로스파트 프론트 규약](../convention/frontConvention.md): 여러 파트가 함께 지켜야 하는 프론트 계약 규칙이다.
- [프론트 내부 규약](../../frontend/docs/frontConvention.md): 현재 프론트 코드베이스의 내부 구조와 구현 규칙이다.
- [AI 규약](../convention/aiConvention.md): 저장소 공통 관점의 AI 파트 규약이다.

## 프론트 문서

- [계약 현황](../../frontend/docs/contracts.md): 계약 상태를 찾는 첫 문서다. 실제 값은 표가 가리키는 원본에서 확인한다.
- [IA](../../frontend/docs/ia.md): 화면 구조와 화면별 데이터·AI 슬롯을 찾는다.
- [프론트 내부 규약](../../frontend/docs/frontConvention.md): 프론트 모듈 경계, 상태 처리, 스타일 사용 규칙을 찾는다.

## AI 문서

- [AI OpenAPI](../../ai/docs/openapi.json): AI 서버 구현 스키마의 기준이다.
- [AI API 명세](../../ai/docs/api-spec.md): 엔드포인트별 의미와 응답 규약을 설명한다.
- [엔진 산식](../../ai/docs/engine-formulas.md): 포트폴리오·위험·기여도·이벤트 계산의 정의와 계산 주체를 찾는다.
- [프롬프트 정책](../../ai/docs/prompt-policy.md): 프롬프트 조립, 근거 표기, 가드레일, 실패 처리 규칙을 찾는다.
- [API 테스트 가이드](../../ai/docs/api-testing.md): AI API를 실행하고 스키마 변경을 검증하는 절차다.
- [시드 데이터셋](../../ai/docs/seed-dataset.md): AI 데이터 적재 범위, 재현 절차, 알려진 제약을 찾는다.
- [검색 성능 기록](../../ai/docs/retrieval-performance.md): 검색 지연 측정 조건과 결과의 한계를 찾는다.
- [AI 작업 기록](../../ai/docs/worklog-2026-08-19.md): 당시 작업의 경과와 남은 항목을 보존한 기록이다.

## 디자인과 운영

- [FINCH SEED](../design/finch-seed.md): 디자인 토큰 체계의 구조와 의도를 설명한다. 실제 값은 문서가 가리키는 스타일 원본에서 읽는다.
- [배포 런북](../ops/deploy-runbook.md): 배포 전제, 순서, 검증, 롤백 절차를 찾는다.
- [Pico 운영 브리핑](../ops/pico.md): 서버 운영자가 맡는 범위와 진단 절차를 찾는다.

## 결정 기록

[ADR 색인](../adr/README.md)이 ADR 유형과 추가 규칙의 원본이다. 스프린트 ADR은 당시의 결정과 검증을 보존한 기록이므로 현재 정책처럼 고쳐 쓰지 않는다.

- [Sprint 1](../adr/sprints/sprint-1.md)
- [Sprint 2](../adr/sprints/sprint-2.md)
- [Sprint 3](../adr/sprints/sprint-3.md)
- [Sprint 4](../adr/sprints/sprint-4.md)
- [Sprint 5](../adr/sprints/sprint-5.md)
- [Sprint 6](../adr/sprints/sprint-6.md)
- [Sprint 7](../adr/sprints/sprint-7.md)
- [Sprint 8](../adr/sprints/sprint-8.md)

## 문서를 고칠 때

1. 이 지도에서 원본과 소유자를 찾는다.
2. 현재 판단이 필요하면 [아직 안 정해진 것](./OPEN_QUESTIONS.md)이 가리키는 상태표와 변경 이력을 대조한다.
3. 새 결정은 해당 원본이나 새 ADR에 기록한다. 과거 스프린트 ADR은 수정하지 않는다.
4. 파일이나 책임의 위치가 바뀌었을 때만 이 지도를 고친다.

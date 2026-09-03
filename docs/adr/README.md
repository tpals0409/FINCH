---
type: index
domain: docs/adr
---
# ADR (Architecture Decision Records)

FINCH 의 아키텍처 결정과 스프린트 회고를 보관한다.

## 디렉터리 구조

```
docs/adr/
├─ README.md                      ← 본 문서
├─ ADR-{NNN}-{slug}.md            ← 영구 ADR (0개)
├─ topics/{topic-slug}.md         ← 토픽 ADR (0개)
└─ sprints/sprint-{N}.md          ← 회고형 sprint ADR (3개)
```

> 위 "(N개)" 표기는 실제 파일 수와 일치해야 한다. ADR 을 추가하면 같이 고친다.

## 분류 기준

| 유형 | 명명 | 위치 | 용도 |
|------|------|------|------|
| **영구 ADR** | `ADR-{NNN}-{slug}.md` | `docs/adr/` | 아키텍처·플랫폼 차원 결정. 스프린트가 바뀌어도 유효한 것 |
| **토픽 ADR** | `{topic-slug}.md` | `docs/adr/topics/` | 주제별 심화. 스프린트 회고와 별도로 보존할 가치가 있는 것 |
| **회고형 sprint ADR** | `sprint-{N}.md` | `docs/adr/sprints/` | 스프린트 단위 결정·구현·검증·교훈. `/sprint-close` 가 자동 생성 |

## 회고형 sprint ADR

`/sprint-close` 가 매 스프린트 종료 시 생성한다. 표준 구조:

- frontmatter: `sprint` · `title` · `date` · `status` · `parts` · `related_adrs` · `topics` · `tldr`
- 본문: 목표 / 결정 사항 / 구현 / 인시던트 / 이월 / 교훈

`tldr` 은 본문을 안 읽어도 검색에 걸리게 한 문단으로 쓴다.
구현 절의 규모·검증 수치는 **물리적 사실**이어야 한다. 안 돌려봤으면 "미실행"이라 적는다.

빠른 검색:
```bash
ls docs/adr/sprints/ | sort -V | tail -5      # 최근 5개
grep -l "{keyword}" docs/adr/sprints/*.md     # 키워드 검색
```

## 신규 ADR 추가 시

| 결정 유형 | 작성 위치 | 명명 |
|-----------|-----------|------|
| 스프린트 회고 | `sprints/sprint-{N}.md` | `/sprint-close` 자동 |
| 영구 아키텍처 결정 | `ADR-{다음 번호}-{slug}.md` | ADR-001 부터. 의식적으로 명명 |
| 주제별 심화 | `topics/{topic}-{slug}.md` | 스프린트 회고와 별개로 남길 때 |

영구·토픽 ADR 을 추가하면 본 README 에 표를 만들어 등록한다.

## 팀 프로젝트에서 이어받은 것

SSAFY 팀 저장소(S15P21A101)의 결정은 `docs/convention/`, `docs/api/`, `docs/spec/` 에 그대로 있다.
ver2 에서 그 결정을 뒤집을 때 영구 ADR 로 남긴다. 뒤집지 않은 것은 그대로 유효하다.

# 비밀값 인벤토리

**값을 적지 않는다.** 이 문서는 "무엇이 필요하고, 어디서 받고, 지금 있는가" 만 적는다.
값은 `.env`(로컬) · GitHub Secrets(CI) · SealedSecret(배포)에만 둔다.

이 문서가 있는 이유 — 선언이 다섯 표면(`backend/application.yaml` · `infra/.env.example` ·
`ai/.env.example` · `frontend/.env.example` · GitHub Secrets)에 흩어져 있고 **층마다 이름이 다르다.**
그래서 하나 만들 때마다 "또 있었네" 가 된다. 새 비밀값을 만들면 여기 한 줄을 먼저 추가한다.

## 1. 외부에서 발급받는 것

계정을 만들고 신청해야 하는 값들이다. 발급에 시간이 걸릴 수 있으므로 필요한 스프린트 전에 받아둔다.

| 이름 | 발급처 | 쓰는 곳 | 언제 필요 | 상태 |
|---|---|---|---|---|
| `KAKAO_CLIENT_ID` | [카카오 개발자 콘솔](https://developers.kakao.com) — **REST API 키**(JavaScript 키가 아니다) | backend · frontend | 로그인. **이미 필요** | ✅ |
| `KAKAO_CLIENT_SECRET` | 같은 콘솔. Client Secret 을 켠 앱만 값이 있다 | backend | 로그인 | ✅ (미사용 시 빈 값) |
| `KIS_APP_KEY` · `KIS_APP_SECRET` · `KIS_ACCOUNT_NO` | [한국투자증권 OpenAPI](https://apiportal.koreainvestment.com) — **모의투자** 앱키 | backend(시세) · ai | 시세 스프린트의 전제 | ❌ |
| `DART_API_KEY` | [DART OpenAPI](https://opendart.fss.or.kr) | ai | 공시·재무 | ❌ |
| `NAVER_CLIENT_ID` · `NAVER_CLIENT_SECRET` | NAVER API HUB Application 인증정보. **NCP IAM Access Key 가 아니다** | ai | 뉴스 | ❌ |
| `ECOS_API_KEY` | [한국은행 ECOS](https://ecos.bok.or.kr) | ai | 거시지표 | ❌ |
| `KRX_API_KEY` | KRX OpenAPI (`data-dbg.krx.co.kr`) | ai | 지수·시가총액 | ❌ |
| `GMS_KEY` · `GMS_BASE_URL` | **SSAFY GMS** (OpenAI 호환) | ai | LLM | ⚠️ 아래 참고 |

> ⚠️ **`GMS_KEY` 는 SSAFY 인프라에 묶여 있다.** 개인 ver2 인데 LLM 게이트웨이가 교육기관 것이라
> 수료하면 끊긴다. OpenAI 호환 인터페이스라 교체는 `GMS_BASE_URL` · `LLM_MODEL` · 키 셋만 바꾸면
> 되지만, 끊기고 나서 알면 AI 기능 전체가 멈춘 상태에서 대응하게 된다.

## 2. 직접 만드는 것

발급이 아니라 생성이다. 지금 다 만들 수 있다.

| 이름 | 만드는 법 | 쓰는 곳 |
|---|---|---|
| `JWT_SECRET` | UTF-8 **32바이트 이상**. 짧으면 기동 시 `WeakKeyException` 으로 거부된다 | backend |
| `POSTGRES_PASSWORD` (backend) | 임의 문자열 | backend · postgres |
| AI DB 비밀번호 | 임의 문자열. backend 와 **다른 DB 다** (pgvector) | ai · postgres-ai |
| `BACKEND_SERVICE_TOKEN` / 내부 토큰 | 임의 문자열. 백엔드 ↔ AI 내부 호출의 `X-Internal-Token` | backend · ai |
| `GRAFANA_ADMIN_PASSWORD` | 임의 문자열. 비우면 Grafana 가 기동을 거부한다(의도된 설계) | 관측 스택 |

`openssl rand -base64 48` 정도면 충분하다.

## 3. GitHub Secrets

| 이름 | 종류 | 권한 | 상태 |
|---|---|---|---|
| `FINCH_TOKEN` | fine-grained PAT | 저장소 `FINCH` · `finch-gitops` / Contents: RW · Pull requests: RW | ✅ 2026-09-03 등록 |
| `KAKAO_CLIENT_ID` | 값 복사 | — (공개 client_id 라 비밀이 아니다) | ❌ **미등록** |
| `GITHUB_TOKEN` | 자동 제공 | 워크플로가 `permissions:` 로 선언 | — |

> ❌ **`KAKAO_CLIENT_ID` 가 없으면 카카오 로그인이 죽은 프런트가 배포된다.** Vite 는 빌드 시점에
> 값을 번들에 박으므로 런타임 주입이 안 된다. `images.yml` 이 `build-args` 로 참조만 하고 있어
> 지금은 빈 값으로 빌드된다 — **빌드도 배포도 성공하고 로그인 버튼만 동작하지 않는다.**
> 조용히 실패하는 종류라 배포 전에 반드시 등록한다.

**`FINCH_TOKEN` 으로 `.github/workflows/` 아래 파일을 푸시할 수 없다.** fine-grained 토큰이 워크플로
파일을 수정하려면 `Workflows` 권한이 따로 필요하고, 주지 않았다. GHCR 푸시는 `GITHUB_TOKEN` 이 한다.

만료되면 **태그 갱신 단계만** 실패한다. 빌드·푸시는 계속 돈다.

## 4. 클러스터가 있어야 하는 것

| | 비고 |
|---|---|
| SealedSecret 봉인키 | 클러스터가 생성한다. 위 1·2 의 값을 봉인해 `finch-gitops` 에 넣는다 |
| ArgoCD → `finch-gitops` 접근 | 비공개 저장소다. `FINCH_TOKEN` 으로 통합할 수 있다 |
| GHCR pull secret | 패키지를 비공개로 둘 경우에만 |

**평문 `Secret` 을 `finch-gitops` 에 넣지 않는다.** 비공개 저장소라도 마찬가지다 — 공개 여부는
클릭 한 번이고 git 이력은 지워지지 않는다.

## 5. 층마다 이름이 다른 것

같은 값인데 표면에 따라 이름이 다르다. 옮길 때 여기를 본다.

| 실제 값 | `backend/application.yaml` | `infra/.env.example` |
|---|---|---|
| JWT 서명 키 | `JWT_SECRET` | `BACKEND_JWT_SECRET` |
| backend DB 비밀번호 | `POSTGRES_PASSWORD` | `BACKEND_DB_PASSWORD` |
| backend DB 사용자·이름 | `POSTGRES_USER` · `POSTGRES_DB` | `BACKEND_DB_USER` · `BACKEND_DB_NAME` |

카카오 키는 `KAKAO_CLIENT_ID` 로 양쪽이 같다. 프론트는 `VITE_KAKAO_REST_API_KEY` 로 받는데
**같은 값이어야** 인가 코드와 토큰 교환의 앱이 일치한다. 공개 client_id 라 번들에 실려도 되는 값이다.

## 규칙

- `.env` 는 커밋하지 않는다. `.env.example` 에는 **키 이름과 형식만** 적는다
- 로그에 JWT·토큰·키·PII·DB 연결 문자열을 남기지 않는다
- 비밀값이 필요해지면 **이 문서에 한 줄 먼저 추가**하고 만든다. 그래야 다음 사람이 목록을 본다

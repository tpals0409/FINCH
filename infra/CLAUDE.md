# 인프라 파트 에이전트 지침

이 문서는 `infra/` 이하에서, 그리고 배포·운영 작업을 할 때 읽는 지침이다.

## 두 저장소로 나뉜다

| 저장소 | 역할 | 위치 |
|---|---|---|
| **이 저장소** `infra/` | Dockerfile 3종, 로컬 개발용 compose, nginx 설정 | `~/Desktop/FINCH/infra` |
| **finch-gitops** | k8s 매니페스트, ArgoCD, Helm 차트, 환경별 values | `~/Desktop/finch-gitops` |

**배포 상태의 단일 진실 공급원은 finch-gitops 다.** 클러스터에 무엇이 떠 있는지는 그쪽 `apps/prod/*/values.yaml` 이 결정한다.
이 저장소의 `infra/docker-compose*.yml` 은 로컬 개발용으로만 남는다. 둘을 평행으로 유지하려 하지 않는다.

CI 는 GitHub Actions, CD 는 ArgoCD 다. 흐름은 다음과 같다.

```
이 저장소 push → Actions 가 Dockerfile 로 이미지 빌드 → GHCR push
  → finch-gitops 의 values.yaml 이미지 태그 갱신 커밋 → ArgoCD 가 감지해 배포
```

## 이 디렉터리 안의 것

```
docker/
  backend.Dockerfile     Gradle 빌드 → JRE 이미지. Actions 가 이걸로 finch-backend 를 만든다
  frontend.Dockerfile    Vite 빌드 → nginx:alpine. finch-frontend
  ai.Dockerfile          pip → uvicorn. CMD 가 alembic upgrade head 를 먼저 돈다. finch-ai
nginx/nginx.conf         frontend 이미지에 들어가는 설정
docker-compose.yml       로컬 앱 스택 (nginx · backend · ai · postgres 2대 · redis)
docker-compose.observability.yml  prometheus · loki · alloy · grafana. finch-gitops 로 옮길 대상
```

## CI

워크플로가 둘이다. 나눈 이유는 실패의 의미가 달라서다 — `ci.yml` 이 빨간 것은 코드가
잘못된 것이고, `images.yml` 이 빨간 것은 배포가 막힌 것이다.

| 파일 | 하는 일 |
|---|---|
| `.github/workflows/ci.yml` | 검증. `frontend`(검증 4종 + 대비 검사) · `backend`(`./gradlew build`) |
| `.github/workflows/images.yml` | 이미지 빌드 → GHCR push → finch-gitops 태그 갱신 |

`images.yml` 은 PR 에서 빌드만 하고 push 하지 않는다. master push 에서만 GHCR 에 올리고
`sha-<커밋 12자리>` 로 finch-gitops 의 `apps/prod/*/values.yaml` 을 한 커밋으로 갱신한다.
가변 태그를 GitOps 에 넣으면 매니페스트가 그대로인데 이미지 내용만 바뀌어 Argo CD 가
변화를 못 본다. 크로스 레포 쓰기라 `secrets.FINCH_TOKEN` 이 필요하다.

SSAFY 시절의 GitLab CI · Jenkins 파일은 Sprint 3 에서 전부 지웠다. GitHub 에서 돌지 않는데
남아 있으면 "CI 가 있다"는 착각을 준다.

## 이 저장소에서 고쳐야 finch-gitops 가 동작하는 것

1. ~~**`nginx/nginx.conf` 의 TLS 제거.**~~ Sprint 3 에서 했다. 443 블록이 컨테이너에 없는
   `/etc/letsencrypt/live/j15a101.p.ssafy.io/` 를 가리켜 k8s 에서 nginx 가 기동조차 못 했다
   (실측: `nginx -t` 가 `[emerg] cannot load certificate`). `/jenkins/` 도 같이 지웠다.
   **`/api/` 프록시는 남겨 뒀다** — 로컬 compose 가 호스트에 nginx 80 하나만 열어서
   브라우저가 같은 오리진의 `/api` 를 부를 길이 그것뿐이다. k8s 에서는 Ingress 의 `/api` 가
   `/` 보다 긴 프리픽스라 먼저 매칭돼 이 블록에 요청이 닿지 않는다. compose 를 버리는 날 같이 지운다
2. **`ai.Dockerfile` 의 마이그레이션 분리.** CMD 에 붙은 `alembic upgrade head` 는 replica 1 에서만 안전하다.
   늘릴 때 finch-gitops 차트의 `bootstrap.enabled` 로 Job 을 분리하고 CMD 에서 뺀다

## 자주 틀리는 지점

**포트는 컨테이너 내부 기준이다.** backend 8080, ai 8000, frontend 80. compose 가 호스트에 여는 건 nginx 의 **80 하나뿐이다** (`docker-compose.yml` 의 `"80:80"`, `nginx.conf` 의 `listen 80`). 443 은 TLS 블록과 함께 Sprint 3 에서 사라졌다 — TLS 는 여기서 끊지 않는다.

**postgres 는 두 대다.** `postgres-backend`(postgres:17) 와 `postgres-ai`(pgvector/pgvector:pg17). 이미지가 다르니 합치지 않는다.

**ai 는 외부에 열지 않는다.** compose 의 nginx 에도 ai 로 가는 경로가 없고, finch-gitops 에도 Ingress 가 없다. 이유는 `ai/CLAUDE.md`.

**시크릿은 SealedSecret.** 클러스터의 봉인 키로 암호화한 것만 finch-gitops 에 커밋한다. 평문 Secret 은 어디에도 넣지 않는다.

## 검증

로컬 스택이 뜨는지:

```
cd infra && docker compose up -d --wait && docker compose ps
```

배포 매니페스트는 finch-gitops 에서:

```
helm template backend charts/microservice -f apps/prod/backend/values.yaml | kubeconform -strict
```

## 참고: 검증된 레퍼런스

같은 구조를 이미 두 번 굴렸다. 막히면 여기서 답을 찾는다.

- `~/Desktop/핀로그/infra` — Helm 공용 차트 + ApplicationSet. finch-gitops 의 원본. 부트스트랩 스크립트 5단계
- `tpals0409/aether-gitops` — Kustomize. SealedSecret 14개, Cloudflared 터널, Alertmanager Discord 연동

# FINCH 첫 배포 런북

서버 상주 에이전트(**Pico**)가 따라 하는 절차다. 브리핑은 `docs/ops/pico.md` 에 있고,
이 문서는 그중 **최초 부트스트랩 한 번**만 다룬다.

**배포 자체는 ArgoCD 가 한다.** 여기 있는 것은 ArgoCD 에게 일을 시작시키는 절차이고,
이 뒤로는 `master` 에 머지하면 이미지가 빌드되고 태그가 갱신되고 알아서 반영된다.

---

## 0. 시작 전 조건

아래가 전부 참이어야 한다. 하나라도 아니면 **멈추고 보고한다.**

| 확인할 것 | 이래야 한다 |
|---|---|
| `kubectl -n argocd get statefulset argocd-application-controller` | `READY 1/1` |
| `kubectl -n kube-system get deploy sealed-secrets-controller` | Running |
| `kubectl get crd sealedsecrets.bitnami.com` | 있음 |
| `kubectl get crd servicemonitors.monitoring.coreos.com` | 있음 |
| `finch-gitops` 저장소 | **public 이다** (2026-09-06 전환). 자격증명이 필요 없다 |
| `kubectl get storageclass` | 기본 StorageClass 가 있음 (k3s 는 `local-path`) |

**StorageClass 가 특히 조용히 막는 자리다.** postgres 두 대가 각각 10Gi PVC 를 요구하는데
기본 StorageClass 가 없으면 PVC 가 `Pending` 에 머물고 파드는 영원히 `ContainerCreating` 이다.
에러가 아니라 정지라서 뭘 기다리는지 보이지 않는다 — `kubectl -n finch-prod describe pvc` 가
그때 답을 준다.

또 하나 — `platform/data/` 에 아래 봉인본이 다 있어야 한다. 없으면 그 Secret 을 기다리는
파드가 `CreateContainerConfigError` 로 멈춘다.

```
sealed-postgres-backend.yaml
sealed-backend-secrets.yaml
sealed-origin-tls.yaml
```

`sealed-ghcr-pull.yaml` 은 GHCR 패키지가 public 이면 없어도 된다.

---

> ## ⚠️ 봉인 전에 apply 하지 마라
>
> "일단 postgres 만 띄워서 파이프라인을 시험해보자" 가 안 되는 이유가 있다.
>
> `seal.sh` 는 `postgres-backend-secret` 과 `backend-secrets` 를 **같은 비밀번호로 새로**
> 만든다. 봉인된 값은 되읽을 수 없어서 그 방법밖에 없다. 그런데 postgres 가 이미 한 번
> 떴다면 **PVC 안의 DB 는 그때 받은 옛 비밀번호를 그대로 들고 있다** — 새 Secret 이 와도
> DB 자신의 비밀번호는 안 바뀐다. 그때부터 백엔드가 `password authentication failed` 로
> 붙지 못하고, 고치려면 PVC 를 지워야 한다(= 데이터를 버린다).
>
> **`keys.md` 를 다 채우고 `seal.sh` 를 돌린 뒤에 시작한다.**

## 1. AppProject 를 먼저 apply 한다

```bash
kubectl apply -f https://raw.githubusercontent.com/tpals0409/finch-gitops/main/argocd/projects/finch.yaml
```
(저장소가 비공개면 클론해서 로컬 경로로 apply 한다)

**루트 앱보다 먼저여야 한다.** 루트 앱이 `project: finch` 를 참조하는데, 루트 앱은 자기
관리 범위에서 `projects/*` 를 제외해 두었다 — ArgoCD 가 자기 자신을 관리하려다 꼬이는 것을
막으려는 설계다. 그 대가로 이 하나는 사람이 넣어야 한다.

확인:
```bash
kubectl -n argocd get appproject finch
```

---

## 2. 루트 앱을 apply 한다

```bash
kubectl apply -f .../argocd/root/root-app.yaml
```

이것 하나면 나머지는 git 에서 자동으로 따라온다 — 네임스페이스, 데이터 계층(postgres·redis),
그리고 `apps/prod/*` 를 훑어 서비스 Application 을 만드는 ApplicationSet 까지.

**첫 동기화에서 CPU 가 튄다.** 이전 실측에서 컨트롤러가 순간 `1269m` 까지 갔다. 2 vCPU
(allocatable 1750m) 환경이라 잠깐 느려지지만 죽지는 않는다. 놀라지 말 것.

---

## 3. 지켜본다

```bash
kubectl -n argocd get applications -w
kubectl -n finch-prod get pods -w
```

떠야 하는 것 — `postgres-backend` · `postgres-ai` · `redis` · `backend` · `frontend`.
**`ai` 는 안 뜨는 게 정상이다.** 첫 배포에서 껐다(`apps/prod/ai/values.yaml` 의
`application.enabled: false`). 이유는 그 파일 주석에 있다.

`backend` 는 기동이 느리다. JVM 이고 Flyway 마이그레이션이 먼저 돈다.
`startupProbe` 가 그만큼을 기다리게 돼 있으니 `Running` 이 될 때까지 둔다.

---

## 4. 확인

```bash
kubectl -n finch-prod get pods
curl -sI https://app.finchapp.org/
curl -s -o /dev/null -w "%{http_code}\n" "https://app.finchapp.org/api/v1/stocks/search?keyword=005930"
```

마지막이 **`401` 이면 성공이다.** 인증이 필요한 엔드포인트가 인증을 요구한다는 것은
백엔드가 살아서 응답한다는 뜻이다. `200` 이 아니라 `401` 을 기대한다.

**검색어를 종목코드로 쓰는 이유** — 한글을 인코딩 없이 URL 에 넣으면 **Tomcat 이 스프링에
닿기 전에 `400` 으로 거절한다**(로컬 실측). 배포가 멀쩡해도 실패로 읽힌다. 한글로 확인하려면
`curl -G --data-urlencode "keyword=삼성"` 처럼 인코딩해서 보낸다.

인증서도 본다 — issuer 가 `TRAEFIK DEFAULT CERT` 가 아니라 Cloudflare Origin CA 여야 한다.
```bash
echo | openssl s_client -connect app.finchapp.org:443 -servername app.finchapp.org 2>/dev/null \
  | openssl x509 -noout -issuer
```

---

## 5. 그다음 — KIS 토큰 발급

**이번 배포의 진짜 목적이다.** 이 서버에서 한국투자증권 API 에 토큰을 발급해
**IP 화이트리스트가 필요한지 판명한다.** 로컬에서는 망이 막혀 한 번도 확인하지 못했다.

키는 `backend-secrets` 에 들어 있어 파드 안에 환경변수로 있다. `curl` 도 이미지에 있다.

```bash
kubectl -n finch-prod exec deploy/backend -- sh -c '
  curl -sS -o /tmp/kis.json -w "%{http_code}\n" \
    -X POST https://openapivts.koreainvestment.com:29443/oauth2/tokenP \
    -H "content-type: application/json" \
    -d "{\"grant_type\":\"client_credentials\",\"appkey\":\"$KIS_APP_KEY\",\"appsecret\":\"$KIS_APP_SECRET\"}"
'
```

**본문을 `/tmp` 로 빼고 상태 코드만 찍는 이유** — 성공 응답 본문에는 **접근 토큰이 들어 있다.**
로그에도 보고에도 남기면 안 된다.

| 결과 | 뜻 | 다음 |
|---|---|---|
| `200` | 발급 성공. **화이트리스트가 필요 없다** | 이 스프린트의 미지수가 풀렸다. 시세 수집을 만들 수 있다 |
| `403` 계열 | IP 가 막혔을 가능성 | 아래 명령으로 **오류 코드만** 꺼내서 알려줘 |
| `401` 계열 | 키가 틀렸거나 만료 | 〃 |

실패했을 때만 본문을 본다. **실패 응답에는 토큰이 없고 오류 코드만 있다.**

```bash
kubectl -n finch-prod exec deploy/backend -- sh -c 'cat /tmp/kis.json'
```

성공했다면 본문을 보지 말고 지우면 된다.

```bash
kubectl -n finch-prod exec deploy/backend -- sh -c 'rm -f /tmp/kis.json'
```

화이트리스트가 필요하다고 나오면 egress IP `223.130.147.160` 을 증권사에 등록해야 한다.
그건 사람이 하는 일이니 결과만 알려주면 된다.

## 6. AI 코퍼스 복원

**AI 를 켜기 전 마지막 단계다.** `postgres-ai` 는 initdb 직후라 비어 있고, 임베딩
10,198청크는 다시 만들 수 없다 — 일일 토큰 예산(500,000)의 몇 배가 든다. 백업본 복원이
유일한 길이다.

옮기는 파일은 **`ai-corpus-20260907.dump`** 다. 사용자 데이터를 뺀 코퍼스 전용 덤프이고
`documents`(219) · `document_chunks`(10,198) · `index_daily`(271) · `price_daily`(8,594) ·
`instruments`(2,598) · `events`(1,197) · `financial_annual` 만 들어 있다. 위키·논지·AI 응답 등
사람 것은 담지 않았다. 약 67MB, 커스텀 포맷(`pg_dump -Fc --data-only`).

**스키마는 옮기지 않는다.** AI 이미지가 기동할 때 alembic 이 만든다. 그래서 데이터만 있는
덤프이고, **복원은 AI 파드가 한 번 떠서 마이그레이션을 끝낸 뒤**여야 한다.

**파일은 GitHub Release 에 있다.** 이 노트북에서 서버로 가는 SSH 가 닫혀 있어(22 차단)
서버가 직접 받는 편이 유일한 경로다. 인증 없이 받아진다.

```bash
# 1) 서버에서 받아 파드 안으로 넣는다
curl -fsSL -o /tmp/corpus.dump \
  https://github.com/tpals0409/FINCH/releases/download/ai-corpus-20260907/ai-corpus-20260907.dump

# 받은 파일이 온전한지 본다. 다르면 다시 받는다 — 깨진 덤프는 중간까지 복원하고 멈춘다
echo "8ca0204cd801bc3aa49981cd6b5e4dccbca5101b9b04c7b639e0449bddb55778  /tmp/corpus.dump" | sha256sum -c

kubectl -n finch-prod cp /tmp/corpus.dump postgres-ai-0:/tmp/corpus.dump

# 2) 복원. --disable-triggers 는 FK 순서를 신경 쓰지 않기 위한 것이다
kubectl -n finch-prod exec postgres-ai-0 -- sh -c '
  pg_restore -U ai_invest -d ai_invest --data-only --disable-triggers /tmp/corpus.dump
'

# 3) 확인 — 아래 숫자가 나와야 한다
kubectl -n finch-prod exec postgres-ai-0 -- psql -U ai_invest -d ai_invest -Atc "
  select (select count(*) from documents), (select count(*) from document_chunks),
         (select count(*) from index_daily), (select count(*) from instruments);
"
# 기대값: 219|10198|271|2598

# 4) 파일을 지운다. 파드 디스크에도 서버에도 남길 이유가 없다
kubectl -n finch-prod exec postgres-ai-0 -- rm -f /tmp/corpus.dump
rm -f /tmp/corpus.dump
```

`document_chunks` 는 1024차원 벡터 10,198행이라 복원에 몇 분 걸린다. **벡터 인덱스는 없다**
(ivfflat·hnsw 둘 다). 행 수가 이 정도면 순차 스캔으로도 답이 나오고, 인덱스를 언제 붙일지는
검색 지연을 실측한 뒤에 정한다.

복원이 끝나면 `apps/prod/ai/values.yaml` 의 `application.enabled` 를 `true` 로 올리는
커밋이 나간다. **그건 저장소에서 하는 일이지 클러스터에서 하는 일이 아니다.**

## 막혔을 때

| 증상 | 원인 | 할 일 |
|---|---|---|
| 루트 앱 `repository not accessible` | 저장소를 못 읽음 | 0번 마지막 줄. 공개 전환 또는 자격증명 |
| `ImagePullBackOff` | GHCR 접근 | 패키지 public 전환 또는 `ghcr-pull` 봉인 |
| `FailedToRetrieveImagePullSecret` 경고만 뜨고 파드는 정상 | 패키지를 public 으로 돌려 `ghcr-pull` 이 없는 상태 | **정상이다.** 공개 이미지는 자격증명 없이 당겨진다. 거슬리면 values 의 `imagePullSecrets` 두 줄을 지운다 |
| `CreateContainerConfigError` | Secret 이 없음 | `platform/data/` 의 봉인본 확인 |
| 브라우저에 `526` | 원본 인증서 | `finch-origin-tls` 가 있는지, Cloudflare 가 Full (strict) 인지 |
| 브라우저에 `52x` | 원본에 못 닿음 | Traefik 과 Ingress 확인 |
| backend `CrashLoopBackOff` | 비밀값 누락 | 로그에 어느 환경변수인지 나온다. **값은 옮겨 적지 말고 이름만** |
| `pg_restore` 가 `relation ... does not exist` | AI 파드가 아직 안 떠서 alembic 이 스키마를 안 만들었다 | 6번은 AI 파드가 한 번 뜬 뒤에 한다 |
| Grafana 에 지표가 안 보임 | **우리 문제 아니다** | Grafana·Alertmanager 가 누락 Secret 으로 비정상이다. 지표는 Prometheus 쿼리로 본다 |

**어느 경우에도 `kubectl edit` 으로 고치지 않는다.** ArgoCD 가 self-heal 로 되돌리고,
되돌아가는 사이에 우리는 고쳤다고 믿게 된다. 무엇이 어긋났는지만 보고하면 저장소를 고친다.

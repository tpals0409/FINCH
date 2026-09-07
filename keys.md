# 배포에 필요한 비밀값

**이 문서는 인벤토리가 아니라 지금 배포를 막고 있는 것의 체크리스트다.**
전체 비밀값 목록은 `docs/spec/secrets.md` 에 있다.

코드 쪽 작업은 전부 끝났다. **다섯 중 넷이 해결됐고 둘 남았다** — 1번(Origin Certificate)과 3번(GitHub 시크릿).

> 3번은 2번과 **같은 REST API 키**를 GitHub 시크릿에도 넣는 일이다. `.env` 는 백엔드용이고
> 프론트는 빌드 시점에 그 시크릿에서 값을 받는다 — 둘 다 있어야 로그인이 산다.

> 🔴 = 없으면 배포가 실패한다 · 🟡 = 배포는 되는데 일부 기능이 죽는다

---

## 1. Cloudflare Origin Certificate 🔴

**없으면**: Ingress 가 참조하는 `finch-origin-tls` Secret 이 없어 Traefik 이 self-signed 로
떨어진다. Cloudflare SSL 을 Full (strict) 로 두면 브라우저에 **`526`** 이 뜬다.

**받는 곳**: Cloudflare 대시보드 → `finchapp.org` → SSL/TLS → **Origin Server** →
Create Certificate

- 호스트명에 **`finchapp.org` 와 `*.finchapp.org` 둘 다** 넣는다.
  와일드카드로 받아두면 나중에 `www` 든 `admin` 이든 붙일 때 재발급이 없다.
- 유효기간은 기본값(15년) 그대로. 갱신 작업이 사라진다.
- **인증서와 개인키가 화면에 한 번만 뜬다.** 둘 다 저장한다.

**둘 곳**:
```
~/Desktop/FINCH/backend/origin.crt   ← Origin Certificate
~/Desktop/FINCH/backend/origin.key   ← Private Key
```

> `backend/.env` 와 `origin.*` 는 `.gitignore` 에 걸려 있다. 커밋되지 않는다.

**같이 할 것**: SSL/TLS → Overview → **Full (strict)** 로 바꾼다.
Flexible 은 Cloudflare→원본 구간이 평문이고, Full 은 원본 인증서를 검증하지 않는다.

---

## 2. 카카오 로그인 키 2종 ✅ **해결됨**

`backend/.env` 에 채워 넣고 `backend-secrets` 로 봉인했다 (2026-09-07, gitops `7c3033a`).
콘솔 설정(플랫폼 · Redirect URI · 동의항목 · Client Secret · 아이콘)도 끝났다.

아래는 다시 할 일이 생겼을 때를 위한 기록이다.

### (기록) 원래 안내

**없으면**: `application.yaml` 이 비밀값에 기본값을 두지 않으므로 **백엔드 파드가 기동에
실패한다.** 조용히가 아니라 요란하게 죽는다 — 그건 다행이다.

**받는 곳**: [카카오 개발자 콘솔](https://developers.kakao.com) → 내 애플리케이션 →
앱 키의 **REST API 키** (JavaScript 키가 아니다) · 보안의 **Client Secret**

**둘 곳**: `~/Desktop/FINCH/backend/.env`
```
KAKAO_CLIENT_ID=<REST API 키>
KAKAO_CLIENT_SECRET=<Client Secret>
```

### 콘솔 설정 — 키보다 이게 먼저다

키가 다 맞아도 아래가 빠지면 로그인이 안 된다. **순서대로 하는 편이 왔다갔다 안 한다** —
①~⑤ 가 설정이고 ⑥ 만 값을 꺼내오는 일이다.

| | 위치 | 넣을 것 |
|---|---|---|
| ① | **플랫폼 키** → Web | `https://app.finchapp.org` |
| ② | 제품 설정 → 카카오 로그인 | 활성화 **ON** |
| ③ | 〃 → Redirect URI | `https://app.finchapp.org/oauth/kakao` |
| ④ | 〃 → 동의항목 | **닉네임: 필수 동의** |
| ⑤ | 〃 → 보안 | Client Secret 생성 + **활성화** |
| ⑥ | **플랫폼 키** (①과 같은 화면) | REST API 키를 복사 |

> 메뉴 이름이 바뀐다. 예전에는 "앱 키"와 "플랫폼"이 나뉘어 있었는데 지금은 **`플랫폼 키`**
> 하나로 합쳐져 키와 도메인 등록이 같은 화면에 있다. 이름이 또 달라도 찾을 것은 같다 —
> **키 네 개가 나열된 화면**과 **Web 플랫폼에 사이트 도메인을 넣는 자리**다.

**① 이 ③ 보다 먼저다.** 카카오 안내가 그대로 적어두고 있다 — "카카오 API는 플랫폼 키에
**플랫폼 정보를 등록한 서비스만** 사용할 수 있습니다". 도메인 없이 키만 가져가거나
Redirect URI 부터 넣으면 인가 단계에서 막힌다.

**③ 은 문자 단위로 같아야 한다.** 끝에 `/` 를 붙이거나 `http` 로 쓰면 `KOE006` 이다.
이 주소는 프론트가 `window.location.origin + /oauth/kakao` 로 만들기 때문에 저 형태로 고정이다.

**④ 를 제일 많이 놓친다.** 백엔드가 닉네임 없는 응답을 받으면 **이름 없는 계정을 만들지 않고
로그인을 실패시킨다**(`AuthErrorCode.AUTH_KAKAO_FAILED`). 프로필 사진은 선택이어도 되고
없으면 `null` 로 처리한다.

**⑥ 은 REST API 키다.** 키가 네 개 뜬다. 이름이 `CLIENT_ID` 인 것은 OAuth 표준 용어라서고
카카오는 그걸 REST API 키라고 부른다.

| 키 | 쓰는 곳 | 우리 |
|---|---|---|
| 네이티브 앱 키 | Android·iOS SDK | ✗ |
| **REST API 키** | 서버·REST 호출 | **✅** |
| JavaScript 키 | 웹 JS SDK | ✗ — SDK 없이 `authorize` 로 직접 이동한다 |
| Admin 키 | 앱 전체 관리 (사용자 강제 탈퇴 등) | ✗ **절대 안 된다** |

🔴 **Admin 키를 넣으면 안 되는 이유.** 이 값은 `KAKAO_CLIENT_ID` 로 들어가고 CI 가 그걸
**프론트 번들에 박는다**(`VITE_KAKAO_REST_API_KEY`). 브라우저로 나가서 누구나 본다.

REST API 키는 그래도 된다 — OAuth 의 `client_id` 는 원래 공개값이고, 알아도 인가 코드를
토큰으로 바꾸려면 Client Secret 이 필요한데 그건 백엔드만 갖는다(`env.ts` 주석).
**Admin 키는 앱 전체를 조작하는 마스터 키라** 공개되면 남이 사용자를 강제 탈퇴시킬 수 있다.

**앱 아이콘**(앱 설정 → 일반)도 같이 올린다. 정사각 PNG, 250KB 이하.

---

## 3. GitHub Actions 시크릿 `KAKAO_CLIENT_ID` 🟡

**없으면**: 빌드도 배포도 **성공하고 로그인 버튼만 비활성으로 뜬다.**
Vite 가 빌드 시점에 값을 박기 때문이고, 프론트는 값이 없으면 버튼을 스스로 잠근다
(`shared/config/env.ts`). **조용히 실패하는 종류라 배포 후에 알아채기 어렵다.**

**할 것**: GitHub → `tpals0409/FINCH` → Settings → Secrets and variables → Actions →
`KAKAO_CLIENT_ID` 에 **2번과 같은 REST API 키**를 넣는다.

등록한 뒤 `master` 에 아무 커밋이나 올라가야 프론트 이미지가 그 값으로 다시 빌드된다.

---

## 4. ArgoCD 가 `finch-gitops` 를 읽을 방법 ✅ **해결됨**

저장소를 **public 으로 돌렸다** (2026-09-06). ArgoCD 가 자격증명 없이 읽는다.

공개 직후 감사했고 남으면 안 될 것은 없었다 — 평문 `Secret` 0개, `stringData` 0개,
서버 IP 0개, 토큰·PAT 0개, 개인키 0개. 들어 있는 것은 암호화된 SealedSecret 과
봉인 **공개**키(`scripts/sealing-cert.pem`)뿐이고, 둘 다 공개 저장소에 두라고 만들어진 것이다.

---

## 5. GHCR 이미지 접근 ✅ **해결됨**

세 패키지(`finch-backend` · `finch-frontend` · `finch-ai`)를 **public 으로 돌렸다**
(2026-09-07). 자격증명이 필요 없어 `ghcr-pull` 도, values 의 `imagePullSecrets` 도 없앴다.

**확인 방법을 적어둔다 — 틀리기 쉽다.** GHCR 은 공개 이미지도 익명 토큰을 먼저 요구해서,
토큰 없이 `/v2/.../tags/list` 를 부르면 공개인데도 `401` 이 온다. 그걸 보고 비공개로
오독한 적이 있다. 토큰을 받아서 물어야 한다.

```bash
p=finch-backend
tok=$(curl -s "https://ghcr.io/token?scope=repository:tpals0409/$p:pull&service=ghcr.io" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $tok" \
  "https://ghcr.io/v2/tpals0409/$p/tags/list"
```

`200` 이면 공개다. 익명 토큰 발급 자체가 실패하면 비공개다.

다시 비공개로 돌리려면 `read:packages` PAT 로 `ghcr-pull` 을 봉인하고
(`GHCR_PAT=<PAT> ./scripts/seal.sh`) `apps/prod/*/values.yaml` 의 `imagePullSecrets` 를
되돌려 적는다.

---

## 다 채운 뒤 — 세 단계

### ① 봉인 (내 노트북에서, 1분)

```bash
cd ~/Desktop/finch-gitops
FINCH=~/Desktop/FINCH ./scripts/seal.sh
```

클러스터에 접속하지 않는다. 봉인 공개키가 저장소에 있어(`scripts/sealing-cert.pem`,
지문 `8B:DF:00:C0:…`) 오프라인으로 봉인되고, **평문이 서버를 거치지 않는다.**

만들어지는 것 — `postgres-backend-secret` · `backend-secrets` · `finch-origin-tls`
(+ PAT 를 줬으면 `ghcr-pull`). 앞의 둘은 **같은 DB 비밀번호로 한 번에** 만들어진다.
따로 만들면 봉인된 값을 되읽을 수 없어 반드시 어긋난다.

그다음 커밋하고 `main` 에 머지한다. (열려 있는 PR: `tpals0409/finch-gitops#1`)

### ② Pico 에게 시킬 것

`docs/ops/deploy-runbook.md` 를 그대로 넘긴다. 요약하면 루트 앱 한 번 apply 다.

### ③ 확인

```bash
curl -I https://app.finchapp.org/
curl -s -o /dev/null -w "%{http_code}\n" "https://app.finchapp.org/api/v1/stocks/search?keyword=삼성"
```

`401` 이 나오면 성공이다 — 인증이 필요한 엔드포인트가 인증을 요구한다는 건
백엔드가 살아서 응답하고 있다는 뜻이다.

---

## 이번 배포에 필요 없는 것

- **AI 서버 키 전부** (`GMS_KEY` · DART · NAVER · ECOS · KRX) — 첫 배포에서 AI 를 껐다.
  `apps/prod/ai/values.yaml` 의 `application.enabled: false` 를 `true` 로 돌릴 때 필요해진다
- **`ai-secrets`** — 위와 같은 이유. 켤 때 `DATABASE_URL` 을 `postgres-ai` 주소로 다시 쓴다
- **`KIS_ACCOUNT_NO` 의 나머지 2자리** — 시세에는 안 쓰이고 주문·잔고에서 필요해진다

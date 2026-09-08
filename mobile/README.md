# FINCH 모바일 셸

Capacitor 기반의 얇은 WebView 셸이다. 운영 웹앱은 `https://app.finchapp.org`만 로드하며 앱 ID는 스토어 등록 전 임시값 `org.finchapp.mobile`이다.

## 범위

- 허용 origin: `https://app.finchapp.org` 단일 origin
- HTTP/mixed content 및 비허용 navigation 차단
- 허용되지 않은 HTTP(S) 링크는 시스템 외부 링크로 분리
- Android 뒤로가기: WebView history가 있으면 뒤로 이동, root에서는 앱 종료
- online/offline 상태 표시와 수동 재시도
- Capacitor 기본 브리지 외 커스텀 브리지 없음
- 로그에는 이벤트·플랫폼 등 비민감 필드만 기록하며 token/cookie/query/fragment/password 계열 키를 제거

## 로컬 검증

```bash
npm install
npm run build
npm test
npx cap sync android
```

Android debug APK:

```bash
cd android
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
./gradlew assembleDebug
```

생성물은 `android/app/build/outputs/apk/debug/app-debug.apk`이며, 빌드 후 다음으로 해시를 기록한다.

```bash
shasum -a 256 android/app/build/outputs/apk/debug/app-debug.apk
```

Capacitor Android 의존성이 Java 21 소스 레벨을 요구하므로 Android 빌드는 JDK 21을 사용한다. 현재 확인된 debug APK는 SHA-256 `016e844196cbcaec11a7f6b52be20a46cb427c0e0137c9b05a26439090c9baa9`이며, 연결된 실기기·에뮬레이터는 없어 ADB 설치/실행 검증은 아직 하지 못했다. 스토어 게시, 운영 서명, iOS 배포는 범위 밖이다.

import { z } from 'zod';

import { IsoDateTimeSchema } from './primitives';

/**
 * 인증 (`docs/api/apiSpec.md` §2 인증 API · `frontend/docs/contracts.md` C20~C25).
 *
 * 카카오 OAuth 2.0 단일이고 자체 회원가입 폼은 없다.
 * **Access Token 은 응답 본문으로 오고 메모리에만 보관한다** (`localStorage` 금지).
 * **Refresh Token 은 본문에 없다.** `HttpOnly + Secure + SameSite=Lax` 쿠키로만 오므로
 * JS 에서 읽을 수 없고 스키마에도 자리가 없다.
 */

/**
 * 로그인한 사용자 (apiSpec §2.1 카카오 로그인 응답의 `user`).
 *
 * `profileImageUrl` 은 **null 일 수 있다.** 카카오의 프로필 사진은 선택 동의 항목이라
 * 사용자가 동의하지 않으면 값이 오지 않는다. 2026-09-02 실제 카카오 로그인에서 확인했다.
 * 빈 문자열이 아니라 null 이다 — `<img src="">` 는 브라우저가 현재 페이지를 다시 요청하게 만들고,
 * "사진 없음" 과 "빈 URL" 을 구분할 수 없게 되므로 서버가 일부러 null 로 내려준다.
 * 화면에서 쓸 때는 기본 아바타로 대체할 것.
 */
export const AuthUserSchema = z.object({
  userId: z.number().int(),
  nickname: z.string(),
  profileImageUrl: z.string().nullable(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

/** `POST /auth/kakao` 요청 (apiSpec §2.1 카카오 로그인). */
export const KakaoLoginRequestSchema = z.object({
  authorizationCode: z.string().min(1),
  redirectUri: z.string().min(1),
});
export type KakaoLoginRequest = z.infer<typeof KakaoLoginRequestSchema>;

/**
 * `POST /auth/kakao` 응답 (apiSpec §2.1).
 * `isNewUser` 가 `true` 면 서버가 계정·가상 계좌·예수금 1,000,000원을 함께 만든 것이다
 * (contracts C47).
 */
export const KakaoLoginResponseSchema = z.object({
  accessToken: z.string().min(1),
  isNewUser: z.boolean(),
  user: AuthUserSchema,
});
export type KakaoLoginResponse = z.infer<typeof KakaoLoginResponseSchema>;

/**
 * `POST /auth/refresh` 응답 (apiSpec §2.2 토큰 재발급).
 *
 * **요청 본문이 없다.** Refresh Token 은 쿠키에서 읽는다. 그래서 요청 스키마도 없다.
 * 프론트는 앱 부팅 시 이 API 를 1회 호출해 세션을 복구한다 (contracts C24).
 * 쿠키가 없는 최초 방문자는 `AUTH_REFRESH_TOKEN_MISSING` 으로 구분되므로
 * 로그인 화면으로 튕기지 않는다.
 */
export const TokenRefreshResponseSchema = z.object({
  accessToken: z.string().min(1),
});
export type TokenRefreshResponse = z.infer<typeof TokenRefreshResponseSchema>;

/**
 * `GET /users/me` 응답 (apiSpec §2.4 내 정보 조회).
 * 사용자 식별자는 토큰에서만 나온다. 경로·본문·쿼리로 `userId` 를 보내지 않는다 (contracts C25).
 *
 * **`currentRoundId` 는 apiSpec v0.7 에서 삭제됐다** (이슈 #27). 계좌는 사용자당 하나라
 * 클라이언트가 식별자로 들고 있을 이유가 없고, 계좌 도메인이 붙어도 `accountId` 로 되살리지 않는다.
 */
export const MeResponseSchema = z.object({
  userId: z.number().int(),
  nickname: z.string(),
  /** null 가능. 이유는 `AuthUserSchema` 주석 참고. */
  profileImageUrl: z.string().nullable(),
  joinedAt: IsoDateTimeSchema,
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

/**
 * `POST /auth/logout` 은 `204 No Content` 다 (apiSpec §2.3 로그아웃).
 * 본문이 없어 응답 스키마를 만들지 않는다.
 */

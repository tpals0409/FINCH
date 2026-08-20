import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import configPrettier from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const srcDirectory = fileURLToPath(new URL('./src', import.meta.url));
const featuresDirectory = `${srcDirectory}/features`;

/**
 * feature 목록을 디스크에서 읽는다.
 * 하드코딩하면 feature 가 늘어날 때마다 이 파일을 고쳐야 하고,
 * 고치는 것을 잊은 순간 교차 참조 금지 규칙에 구멍이 생긴다.
 */
const featureNames = existsSync(featuresDirectory)
  ? readdirSync(featuresDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
  : [];

/**
 * 서로 다른 feature 끼리의 import 를 막는 zone.
 * 공유가 필요하면 shared 로 올리고, 조합이 필요하면 pages 에서 props 로 내린다.
 */
const crossFeatureZones = featureNames.flatMap((target) =>
  featureNames
    .filter((source) => source !== target)
    .map((source) => ({
      target: `${featuresDirectory}/${source}`,
      from: `${featuresDirectory}/${target}`,
      message: `컨벤션 §2: feature 끼리 서로 import 할 수 없다. features/${source} 가 features/${target} 을 참조하고 있다. 공유가 필요하면 shared 로 올리고, 조합이 필요하면 pages 에서 props 로 내린다.`,
    })),
);

/** 의존 방향은 app → pages → features → shared 단방향이다 (컨벤션 §2). */
const layerZones = [
  {
    target: `${srcDirectory}/shared`,
    from: [
      `${srcDirectory}/app`,
      `${srcDirectory}/pages`,
      `${srcDirectory}/features`,
    ],
    message:
      '컨벤션 §2: 의존 방향은 app → pages → features → shared 단방향이다. shared 는 상위 레이어(app/pages/features)를 import 할 수 없다.',
  },
  {
    target: `${srcDirectory}/features`,
    from: [`${srcDirectory}/app`, `${srcDirectory}/pages`],
    message:
      '컨벤션 §2: 의존 방향은 app → pages → features → shared 단방향이다. features 는 app/pages 를 import 할 수 없다.',
  },
  {
    target: `${srcDirectory}/pages`,
    from: [`${srcDirectory}/app`],
    message:
      '컨벤션 §2: 의존 방향은 app → pages → features → shared 단방향이다. pages 는 app 을 import 할 수 없다.',
  },
  {
    target: [
      `${srcDirectory}/shared`,
      `${srcDirectory}/pages`,
      `${srcDirectory}/features`,
    ],
    from: `${srcDirectory}/mocks`,
    message:
      '컨벤션 §2: mocks 는 프로덕션 번들에 들어가면 안 된다. MSW 는 app 진입점의 개발 전용 동적 import 로만 불러온다.',
  },
];

export default defineConfig([
  globalIgnores(['dist', 'public/mockServiceWorker.js']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    settings: {
      // 이것이 없으면 `@/` alias 가 해석되지 않아 no-restricted-paths 가
      // 아무 파일도 매칭하지 못한 채 조용히 통과한다. lint 는 초록인데
      // 경계는 하나도 지켜지지 않는 상태가 된다.
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          project: './tsconfig.app.json',
        }),
      ],
    },
    rules: {
      'import-x/no-restricted-paths': [
        'error',
        { zones: [...layerZones, ...crossFeatureZones] },
      ],
      'import-x/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='fetch']",
          message:
            '컨벤션 §5: 컴포넌트는 fetch 를 직접 부르지 않는다. shared/api 의 HTTP 클라이언트를 쓴다.',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
  {
    // shared/api 는 HTTP 클라이언트 그 자체라 fetch 를 부르는 유일한 자리다.
    files: ['src/shared/api/**/*.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['*.config.{ts,js}', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
  // prettier 와 충돌하는 포매팅 규칙을 끈다. 반드시 배열 마지막이어야 한다.
  configPrettier,
]);

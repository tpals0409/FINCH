#!/usr/bin/env node
/**
 * check-contrast.cjs — src/styles/tokens.css의 역할 토큰 조합이 APCA 대비 기준을 넘는지 검사한다.
 * Design.md 0.3 표를 단일 모드로 옮긴 것. 팔레트를 바꾼 뒤 `node tools/check-contrast.cjs`.
 *
 * APCA 0.98G-4g. Lc 90 본문, 75 일반 텍스트, 60 큰 글자·bold, 45 display 이상, 30 placeholder, 15 경계선.
 */
const fs = require('node:fs');
const path = require('node:path');

const cssPath =
  process.argv.find((a) => a.endsWith('.css')) ||
  path.join(__dirname, '../src/styles/tokens.css');
const css = fs.readFileSync(cssPath, 'utf8');
const vars = new Map();
for (const m of css.matchAll(/(--finch-[\w-]+)\s*:\s*([^;]+);/g))
  vars.set(m[1], m[2].trim());

/** var() 체인을 hex까지 푼다. */
function resolve(name) {
  let v = vars.get(name);
  if (v === undefined) throw new Error(`토큰 없음: ${name}`);
  const ref = v.match(/^var\((--[\w-]+)\)$/);
  return ref ? resolve(ref[1]) : v;
}

function rgb(hex) {
  const n = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  const a = n.length === 8 ? parseInt(n.slice(6, 8), 16) / 255 : 1;
  return { c, a };
}
/** 알파 색은 배경 위에 합성해 불투명 색으로 만든다. */
function composite(fg, bg) {
  const f = rgb(fg),
    b = rgb(bg);
  if (f.a === 1) return f.c;
  return f.c.map((v, i) => Math.round(v * f.a + b.c[i] * (1 - f.a)));
}
function Y([r, g, b]) {
  const lin = (v) => (v / 255) ** 2.4;
  return 0.2126729 * lin(r) + 0.7151522 * lin(g) + 0.072175 * lin(b);
}
/** APCA Lc (절대값). */
function apca(fgHex, bgHex) {
  const bgc = rgb(bgHex).c;
  const clamp = (y) => (y < 0.022 ? y + (0.022 - y) ** 1.414 : y);
  const Yt = clamp(Y(composite(fgHex, bgHex)));
  const Yb = clamp(Y(bgc));
  if (Math.abs(Yb - Yt) < 0.0005) return 0;
  let S;
  if (Yb > Yt) {
    S = (Yb ** 0.56 - Yt ** 0.57) * 1.14;
    return S < 0.1 ? 0 : (S - 0.027) * 100;
  }
  S = (Yb ** 0.65 - Yt ** 0.62) * 1.14;
  return S > -0.1 ? 0 : -(S + 0.027) * 100;
}

const P = (s) => `--finch-color-${s}`;

/*
 * FINCH 역할 집합. 발표 전용 조합(night 섹션, noise, brand-contrast)은 뺐고
 * 앱에만 있는 것(skeleton · disabled · focus-ring)을 넣었다.
 *
 * 여기 없는 것과 그 이유:
 * - selected / pressed 면: 알파-200·gray-100 은 아래 면과의 밝기 차가 APCA 바닥(Lc 0) 아래다.
 *   의도한 것이다. 선택과 눌림은 면 하나로 알리지 않고 글자 무게·테두리·축소가 같이 움직인다.
 *   숫자로 지킬 수 있는 규칙이 아니라 형태로 지키는 규칙이라 표에 넣지 않는다.
 * - up-weak / down-weak 면 자체: 밝기가 흰 면과 거의 같고 색상(hue)으로만 구분된다.
 *   APCA 는 밝기만 보므로 0 이 나온다. 이 면 위 글자(fg-up / fg-down)로 대신 검사한다.
 * - focus-ring on bg-neutral-solid: 잉크 링이 잉크 버튼 위에 그대로 놓이면 Lc 0 이다.
 *   링은 outline-offset 으로 요소 바깥(=paper 또는 카드)에 떠 있어야 하고, 그 쌍은 아래에 있다.
 */
const PAIRS = [
  // 본문·텍스트
  { fg: 'fg-neutral', bg: 'bg-layer-basement', min: 90, note: '본문 on paper' },
  { fg: 'fg-neutral', bg: 'bg-layer-default', min: 90, note: '본문 on 카드' },
  {
    fg: 'fg-neutral-muted',
    bg: 'bg-layer-basement',
    min: 75,
    note: '보조 문장',
  },
  {
    fg: 'fg-neutral-subtle',
    bg: 'bg-layer-basement',
    min: 75,
    note: '캡션 on paper',
  },
  {
    fg: 'fg-neutral-subtle',
    bg: 'bg-layer-default',
    min: 75,
    note: '캡션 on 카드',
  },
  {
    fg: 'fg-placeholder',
    bg: 'bg-layer-default',
    min: 30,
    note: '플레이스홀더 on 입력',
  },
  {
    fg: 'fg-placeholder',
    bg: 'bg-layer-basement',
    min: 30,
    note: '읽지 않아도 되는 메타',
  },
  {
    fg: 'fg-neutral-inverted',
    bg: 'bg-neutral-solid',
    min: 75,
    note: '주요 버튼 글자 on ink',
  },
  {
    fg: 'fg-neutral-inverted',
    bg: 'bg-neutral-solid-pressed',
    min: 75,
    note: '주요 버튼 눌림',
  },
  { fg: 'fg-disabled', bg: 'bg-disabled', min: 30, note: '비활성 버튼 라벨' },
  // 시세 방향
  { fg: 'fg-up', bg: 'bg-layer-basement', min: 75, note: '상승 숫자 on paper' },
  { fg: 'fg-up', bg: 'bg-layer-default', min: 75, note: '상승 숫자 on 카드' },
  {
    fg: 'fg-down',
    bg: 'bg-layer-basement',
    min: 75,
    note: '하락 숫자 on paper',
  },
  { fg: 'fg-down', bg: 'bg-layer-default', min: 75, note: '하락 숫자 on 카드' },
  {
    fg: 'fg-flat',
    bg: 'bg-layer-basement',
    min: 75,
    note: '보합 숫자 on paper',
  },
  { fg: 'fg-up', bg: 'bg-up-weak', min: 75, note: '상승 칩 글자' },
  { fg: 'fg-down', bg: 'bg-down-weak', min: 75, note: '하락 칩 글자' },
  {
    fg: 'fg-up-vivid',
    bg: 'bg-layer-basement',
    min: 45,
    note: '상승 원색 — 18px+ bold 전용',
  },
  {
    fg: 'fg-up-vivid',
    bg: 'bg-layer-default',
    min: 45,
    note: '상승 원색 on 카드',
  },
  {
    fg: 'fg-down-vivid',
    bg: 'bg-layer-basement',
    min: 45,
    note: '하락 원색 — 18px+ bold 전용',
  },
  {
    fg: 'fg-down-vivid',
    bg: 'bg-layer-default',
    min: 45,
    note: '하락 원색 on 카드',
  },
  {
    fg: 'palette-static-white',
    bg: 'bg-up-solid',
    min: 60,
    note: '흰 글자 on 상승 채움 — bold',
  },
  {
    fg: 'palette-static-white',
    bg: 'bg-down-solid',
    min: 60,
    note: '흰 글자 on 하락 채움 — bold',
  },
  // 위험 — 모노톤이라 색이 아니라 잉크다
  {
    fg: 'fg-critical',
    bg: 'bg-layer-basement',
    min: 90,
    note: '폼 에러 메시지',
  },
  { fg: 'fg-critical', bg: 'bg-critical-weak', min: 75, note: '경고 칩 글자' },
  // 경계선
  {
    fg: 'stroke-neutral-weak',
    bg: 'bg-layer-default',
    min: 15,
    note: '카드·입력 외곽선 on 카드',
  },
  {
    fg: 'stroke-neutral-weak',
    bg: 'bg-layer-basement',
    min: 15,
    note: '카드·입력 외곽선 on paper',
  },
  {
    fg: 'stroke-neutral-subtle',
    bg: 'bg-layer-default',
    min: 15,
    note: '카드 안 항목 구분선',
  },
  {
    fg: 'stroke-neutral-contrast',
    bg: 'bg-layer-default',
    min: 15,
    note: '선택된 칩 테두리',
  },
  {
    fg: 'stroke-critical-solid',
    bg: 'bg-layer-default',
    min: 15,
    note: '에러 입력 테두리',
  },
  {
    fg: 'stroke-focus-ring',
    bg: 'bg-layer-basement',
    min: 15,
    note: '포커스 링 on paper (offset 2px)',
  },
  {
    fg: 'stroke-focus-ring',
    bg: 'bg-layer-default',
    min: 15,
    note: '포커스 링 on 카드 (offset 2px)',
  },
  // 앱 전용 면
  {
    fg: 'bg-skeleton',
    bg: 'bg-layer-default',
    min: 15,
    note: '스켈레톤이 카드 위에 보이는가',
  },
  {
    fg: 'bg-disabled',
    bg: 'bg-layer-basement',
    min: 15,
    note: '비활성 버튼 모양이 paper 위에 남는가',
  },
  {
    fg: 'bg-disabled',
    bg: 'bg-layer-default',
    min: 15,
    note: '비활성 버튼 모양이 카드 위에 남는가',
  },
];

module.exports = { apca, resolve };
if (require.main !== module) return;

let failed = 0;
const width = Math.max(...PAIRS.map((p) => `${p.fg} / ${p.bg}`.length));
for (const p of PAIRS) {
  const bg = resolve(P(p.bg));
  // 알파 배경은 아래 면 없이는 합성할 수 없다. rgb() 가 알파를 무시해 순수 검정으로 읽히므로 막는다.
  if (rgb(bg).a !== 1) throw new Error(`배경 슬롯에 알파 색: ${p.bg}`);
  const lc = apca(resolve(P(p.fg)), bg);
  const ok = lc >= p.min;
  if (!ok) failed++;
  console.log(
    `${ok ? '  ' : '✗ '}${`${p.fg} / ${p.bg}`.padEnd(width)}  Lc ${lc.toFixed(1).padStart(5)}  (기준 ${p.min})  ${p.note}`,
  );
}
if (failed) {
  console.error(`\n${failed}건이 기준에 못 미칩니다.`);
  process.exit(1);
}
console.log(`\n${PAIRS.length}건 모두 기준을 넘겼습니다.`);

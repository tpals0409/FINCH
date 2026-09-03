#!/usr/bin/env node
/**
 * ladder.cjs — oklch로 팔레트 사다리를 만든다. 손으로 10단계를 맞추는 대신 원색 하나에서 파생한다.
 *
 *   const { ladder, gray, oklchToHex, hexToOklch } = require("./ladder.cjs");
 *   ladder({ l: 0.68, c: 0.14, h: 172 })            → { 100: "#…", …, 1000: "#…" }  (600이 원색)
 *   gray({ paper, muted, ink })                     → { "00": "#FFFFFF", 100…1000 } (200 paper, 600 muted, 1000 ink)
 *
 * CLI: node tools/ladder.cjs 0.68 0.14 172  → 사다리 출력
 */

/* ── oklch ↔ sRGB ── */
function oklabToLinear(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
function linearToOklab(r, g, b) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
const gamma = (c) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
const degamma = (c) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const inGamut = (rgb) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);

function oklchToHex(l, c, h) {
  const rad = (h * Math.PI) / 180;
  let cc = c;
  let rgb = oklabToLinear(l, cc * Math.cos(rad), cc * Math.sin(rad));
  while (!inGamut(rgb) && cc > 0) {
    cc -= 0.002;
    rgb = oklabToLinear(l, cc * Math.cos(rad), cc * Math.sin(rad));
  } // 채도만 줄여 색역 안으로
  return (
    '#' +
    rgb
      .map((v) =>
        Math.round(Math.min(1, Math.max(0, gamma(v))) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
      .toUpperCase()
  );
}
function hexToOklch(hex) {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) =>
    degamma(parseInt(n.slice(i, i + 2), 16) / 255),
  );
  const [L, a, bb] = linearToOklab(r, g, b);
  return {
    l: L,
    c: Math.hypot(a, bb),
    h: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360,
  };
}

/* ── 유채색 사다리: 600이 원색. 밝은 쪽은 채도를 낮춰 tint, 어두운 쪽은 채도를 조금 줄여 shade. ── */
function ladder({ l, c, h }, opts = {}) {
  const top = opts.top ?? 0.965,
    bottom = opts.bottom ?? 0.27;
  const tint = [0, 0.14, 0.29, 0.52, 0.77]; // 100~500: top → base 사이 위치
  const shade = [0.32, 0.58, 0.82, 1]; // 700~1000: base → bottom 사이 위치
  const shadeL = [0.45, 0.38, 0.31, bottom]; // 글자용 단계는 절대 밝기 상한: 700이 paper 위에서 Lc 75를 넘도록
  const out = {};
  tint.forEach((f, i) => {
    out[(i + 1) * 100] = oklchToHex(
      top - (top - l) * f,
      c * (0.12 + 0.88 * f),
      h,
    );
  });
  out[600] = oklchToHex(l, c, h);
  shade.forEach((g, i) => {
    out[(i + 7) * 100] = oklchToHex(
      Math.min(shadeL[i], l - (l - bottom) * g),
      c * (1 - 0.4 * g),
      h,
    );
  });
  return out;
}

/* ── 회색 사다리: paper(200) · muted(600) · ink(1000) 세 앵커를 oklab에서 보간. 00은 흰색. ── */
function gray({ paper, muted, ink }) {
  const P = hexToOklch(paper),
    M = hexToOklch(muted),
    I = hexToOklch(ink);
  const mix = (A, B, t) => {
    const ah = (A.h * Math.PI) / 180,
      bh = (B.h * Math.PI) / 180;
    const a = A.c * Math.cos(ah) * (1 - t) + B.c * Math.cos(bh) * t;
    const b = A.c * Math.sin(ah) * (1 - t) + B.c * Math.sin(bh) * t;
    return oklchToHex(
      A.l * (1 - t) + B.l * t,
      Math.hypot(a, b),
      ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360,
    );
  };
  const W = { l: 1, c: 0, h: P.h };
  return {
    '00': '#FFFFFF',
    100: mix(W, P, 0.55),
    200: paper,
    300: mix(P, M, 0.25),
    400: mix(P, M, 0.5),
    500: mix(P, M, 0.75),
    600: muted,
    700: mix(M, I, 0.3),
    800: mix(M, I, 0.6),
    900: mix(M, I, 0.82),
    1000: ink,
  };
}

module.exports = { ladder, gray, oklchToHex, hexToOklch };

if (require.main === module) {
  const [l, c, h] = process.argv.slice(2).map(Number);
  if (Number.isFinite(l)) console.log(ladder({ l, c, h }));
  else console.log('usage: node tools/ladder.cjs <L 0..1> <C> <H deg>');
}

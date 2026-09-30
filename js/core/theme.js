// ─────────────────────────────────────────────────────────────
// theme.js — 관리자 페이지에서 고른 색상·글꼴·배경을 실제 화면에 적용
// ─────────────────────────────────────────────────────────────
import { safeUrl } from './dom.js';

// 고를 수 있는 글꼴 목록 (모두 무료 Google Fonts)
// weights: 굵기 목록 (없으면 기본 굵기만 불러옴)
export const FONTS = {
  title: ['Galmuri11', 'Jua', 'Gowun Dodum', 'Song Myung', 'Nanum Myeongjo', 'Hahmlet', 'Noto Serif KR', 'Gowun Batang', 'Diphylleia', 'Black Han Sans', 'Do Hyeon', 'Playfair Display'],
  body: ['Galmuri11', 'Gowun Dodum', 'Gowun Batang', 'Nanum Myeongjo', 'Noto Serif KR', 'Hahmlet', 'Noto Sans KR', 'IBM Plex Sans KR', 'Nanum Gothic'],
  label: ['Galmuri9', 'Galmuri11', 'Gowun Dodum', 'Jua', 'Special Elite', 'Courier Prime', 'IBM Plex Mono', 'Nanum Gothic Coding', 'Cutive Mono'],
  hand: ['Nanum Pen Script', 'Gaegu', 'Hi Melody', 'Nanum Brush Script', 'Gamja Flower', 'Yeon Sung'],
};
const WEIGHTS = {
  'Gowun Batang': 'wght@400;700',
  'Nanum Myeongjo': 'wght@400;700;800',
  'Noto Serif KR': 'wght@400;700',
  Hahmlet: 'wght@400;700',
  'Noto Sans KR': 'wght@400;700',
  'IBM Plex Sans KR': 'wght@400;700',
  'Nanum Gothic': 'wght@400;700',
  'Courier Prime': 'wght@400;700',
  'IBM Plex Mono': 'wght@400;700',
  'Nanum Gothic Coding': 'wght@400;700',
  'Playfair Display': 'ital,wght@0,400;0,700;1,400;1,700',
};
const FALLBACK = {
  title: "'Galmuri11', 'Noto Sans KR', sans-serif",
  body: "'Galmuri11', 'Noto Sans KR', sans-serif",
  label: "'Galmuri9', 'Galmuri11', sans-serif",
  hand: "'Nanum Pen Script', cursive",
};

// 홈페이지 안에 들어 있는 글꼴 (Google Fonts 에서 불러오지 않음) — css/pixel.css 참고
const LOCAL_FONTS = new Set(['Galmuri11', 'Galmuri9']);
const loaded = new Set();
export function loadFont(name) {
  if (!name || loaded.has(name) || LOCAL_FONTS.has(name)) return;
  loaded.add(name);
  const fam = name.replace(/ /g, '+') + (WEIGHTS[name] ? ':' + WEIGHTS[name] : '');
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fam}&display=swap`;
  document.head.append(link);
}

export function fontStack(kind, theme) {
  const map = { title: theme.fontTitle, body: theme.fontBody, label: theme.fontLabel, hand: theme.fontHand };
  const name = map[kind];
  return `'${name}', ${FALLBACK[kind]}`;
}

/** 색의 밝기 (0=검정, 1=흰색) — 배경이 밝으면 글자를 어둡게, 어두우면 밝게 자동 선택 */
function luminance(hex) {
  const m = String(hex || '').match(/^#?([0-9a-f]{6})$/i);
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
export const isLight = (hex) => luminance(hex) > 0.35;

export function applyTheme(theme) {
  const root = document.documentElement.style;
  // 배경 위 글자색 / 메인 색상 위 글자색을 자동으로 정함
  root.setProperty('--c-on-bg', isLight(theme.background) ? theme.text : theme.secondary);
  root.setProperty('--c-on-primary', isLight(theme.primary) ? theme.text : '#fffaf0');
  document.body.classList.toggle('bg-light', isLight(theme.background));
  root.setProperty('--c-primary', theme.primary);
  root.setProperty('--c-paper', theme.secondary);
  root.setProperty('--c-accent', theme.accent);
  root.setProperty('--c-bg', theme.background);
  root.setProperty('--c-ink', theme.text);
  root.setProperty('--f-title', fontStack('title', theme));
  root.setProperty('--f-body', fontStack('body', theme));
  root.setProperty('--f-label', fontStack('label', theme));
  root.setProperty('--f-hand', fontStack('hand', theme));
  const bg = safeUrl(theme.bgImage);
  root.setProperty('--bg-image', bg ? `url("${bg}")` : 'none');
  root.setProperty('--bg-overlay', String(theme.bgOverlay ?? 0.7));
  document.body.classList.toggle('no-grid', !theme.grid);
  document.body.classList.toggle('no-grain', !theme.grain);
  [theme.fontTitle, theme.fontBody, theme.fontLabel, theme.fontHand, 'Gowun Dodum', 'Playfair Display'].forEach(loadFont);
}

// 빠르게 적용할 수 있는 색 조합
export const PRESETS = [
  { name: '도트 데스크탑 (기본)', primary: '#2b3db4', secondary: '#f7eed9', accent: '#e0567c', background: '#cbc3aa', text: '#2a2321', fontTitle: 'Galmuri11', fontBody: 'Galmuri11', fontLabel: 'Galmuri9', fontHand: 'Nanum Pen Script' },
  { name: '모노 매킨토시', primary: '#2b2320', secondary: '#f3efdd', accent: '#2b2320', background: '#cfc9b4', text: '#2b2320', fontTitle: 'Galmuri11', fontBody: 'Galmuri11', fontLabel: 'Galmuri9', fontHand: 'Nanum Pen Script' },
  { name: '한밤 도트', primary: '#3a2f7a', secondary: '#f4eee0', accent: '#f0a84a', background: '#1b1d3a', text: '#2a2440', fontTitle: 'Galmuri11', fontBody: 'Galmuri11', fontLabel: 'Galmuri9', fontHand: 'Nanum Pen Script' },
  { name: '숲속 기록장', primary: '#5f7d45', secondary: '#fbf7ec', accent: '#6b8f45', background: '#efe8d4', text: '#4a3b28', fontTitle: 'Jua', fontBody: 'Gowun Dodum', fontLabel: 'Gowun Dodum', fontHand: 'Nanum Pen Script' },
  { name: '벚꽃 산책', primary: '#b7707a', secondary: '#fff8f5', accent: '#d0707e', background: '#f6e9e4', text: '#533a3a', fontTitle: 'Jua', fontBody: 'Gowun Dodum', fontLabel: 'Gowun Dodum', fontHand: 'Nanum Pen Script' },
  { name: '밤하늘 캠프', primary: '#2f3b52', secondary: '#f5f1e6', accent: '#e0a84f', background: '#1c2233', text: '#2c3140', fontTitle: 'Jua', fontBody: 'Gowun Dodum', fontLabel: 'Gowun Dodum', fontHand: 'Nanum Pen Script' },
  { name: '론드 보관소 (빈티지)', primary: '#1c1a17', secondary: '#e4dab9', accent: '#b3362b', background: '#121110', text: '#2b261f' },
  { name: '세피아 신문', primary: '#2e2419', secondary: '#eadcbf', accent: '#9c3b24', background: '#1d1712', text: '#33271a' },
  { name: '밤의 항해일지', primary: '#141a2a', secondary: '#e3e0d4', accent: '#2f4d8f', background: '#07090f', text: '#1f2a44' },
  { name: '빛바랜 사진첩', primary: '#2b2a26', secondary: '#dcd6c6', accent: '#7d5a44', background: '#1a1917', text: '#34302a' },
];

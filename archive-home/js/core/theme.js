// ─────────────────────────────────────────────────────────────
// theme.js — 관리자 페이지에서 고른 색상·글꼴·배경을 실제 화면에 적용
// ─────────────────────────────────────────────────────────────
import { safeUrl } from './dom.js';

// 고를 수 있는 글꼴 목록 (모두 무료 Google Fonts)
// weights: 굵기 목록 (없으면 기본 굵기만 불러옴)
export const FONTS = {
  title: ['Song Myung', 'Nanum Myeongjo', 'Hahmlet', 'Noto Serif KR', 'Gowun Batang', 'Diphylleia', 'Black Han Sans', 'Do Hyeon', 'Gowun Dodum', 'Playfair Display'],
  body: ['Gowun Batang', 'Nanum Myeongjo', 'Noto Serif KR', 'Hahmlet', 'Gowun Dodum', 'Noto Sans KR', 'IBM Plex Sans KR', 'Nanum Gothic'],
  label: ['Special Elite', 'Courier Prime', 'IBM Plex Mono', 'Nanum Gothic Coding', 'Cutive Mono'],
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
  title: "'Nanum Myeongjo', serif",
  body: "'Gowun Batang', serif",
  label: "'Nanum Gothic Coding', 'Courier New', monospace",
  hand: "'Nanum Pen Script', cursive",
};

const loaded = new Set();
export function loadFont(name) {
  if (!name || loaded.has(name)) return;
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

export function applyTheme(theme) {
  const root = document.documentElement.style;
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
  [theme.fontTitle, theme.fontBody, theme.fontLabel, theme.fontHand, 'Nanum Gothic Coding', 'Playfair Display'].forEach(loadFont);
}

// 빠르게 적용할 수 있는 색 조합
export const PRESETS = [
  { name: '론드 보관소 (기본)', primary: '#1c1a17', secondary: '#e4dab9', accent: '#b3362b', background: '#121110', text: '#2b261f' },
  { name: '세피아 신문', primary: '#2e2419', secondary: '#eadcbf', accent: '#9c3b24', background: '#1d1712', text: '#33271a' },
  { name: '밤의 항해일지', primary: '#141a2a', secondary: '#e3e0d4', accent: '#2f4d8f', background: '#07090f', text: '#1f2a44' },
  { name: '빛바랜 사진첩', primary: '#2b2a26', secondary: '#dcd6c6', accent: '#7d5a44', background: '#1a1917', text: '#34302a' },
];

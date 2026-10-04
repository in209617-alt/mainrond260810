// ─────────────────────────────────────────────────────────────
// cursor.js — 홈페이지 안에서만 보이는 "꾸민 마우스 커서"
// 관리자 페이지 → 디자인 → 마우스 커서 에서 이미지 2장(기본 / 클릭할 때)을 바꿀 수 있어요.
//  · 기본 이미지: 가만히 있을 때 (그리고 움직일 때)
//  · 클릭 이미지: 마우스 버튼을 누르고 있는 동안
// 기본 예시(assets/cursor/1.png)를 쓰고 있을 때만, 움직이는 동안 2~6번 그림이
// 0.3초 간격으로 바뀌는 애니메이션이 함께 재생돼요.
// 마우스가 없는 휴대폰·태블릿에서는 원래대로 동작합니다.
// ─────────────────────────────────────────────────────────────
import { safeUrl } from '../core/dom.js';

export const EXAMPLE_CURSOR = 'assets/cursor/1.png';
const EXAMPLE_MOVE = [2, 3, 4, 5, 6].map((n) => `assets/cursor/${n}.png`);
const FRAME_MS = 300; // 움직일 때 그림이 바뀌는 간격
const STOP_MS = 250; // 마우스가 이만큼 멈추면 "가만히 있음"으로 봄

// 글자를 입력하는 곳에서는 원래 커서(I자 모양)를 보여줌
const TEXT_SEL = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=button]):not([type=submit]):not([type=file]), textarea, select, [contenteditable=""], [contenteditable="true"], iframe';

let el = null;
let cfg = null;
let frames = [];
let normalUrl = '';
let clickUrl = '';
let ready = false; // 기본 이미지가 정상적으로 불러와졌는지
let moving = false;
let pressed = false;
let frameIdx = 0;
let frameTimer = null;
let stopTimer = null;
let x = -200;
let y = -200;
let raf = 0;
let bound = false;
let token = 0;

const fine = () => window.matchMedia?.('(pointer: fine)').matches ?? true;
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function preload(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    const i = new Image();
    i.onload = () => resolve(true);
    i.onerror = () => resolve(false);
    i.src = url;
  });
}

function show(url) {
  if (el && url && el.getAttribute('src') !== url) el.setAttribute('src', url);
}

function paint() {
  if (!el) return;
  if (pressed) show(clickUrl || normalUrl);
  else if (moving && frames.length) show(frames[frameIdx % frames.length]);
  else show(normalUrl);
}

function place() {
  raf = 0;
  if (el) el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

function startFrames() {
  if (frameTimer || !frames.length) return;
  frameIdx = 0;
  paint();
  frameTimer = setInterval(() => {
    frameIdx += 1;
    paint();
  }, FRAME_MS);
}
function stopFrames() {
  clearInterval(frameTimer);
  frameTimer = null;
}

function onMove(e) {
  if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
  x = e.clientX;
  y = e.clientY;
  if (!raf) raf = requestAnimationFrame(place);
  const overText = e.target instanceof Element && e.target.closest(TEXT_SEL);
  document.body.classList.toggle('cursor-text', !!overText);
  el.classList.add('on');
  if (!moving) {
    moving = true;
    startFrames();
    paint();
  }
  clearTimeout(stopTimer);
  stopTimer = setTimeout(() => {
    moving = false;
    stopFrames();
    paint();
  }, STOP_MS);
}
function onDown(e) {
  if (e.button !== undefined && e.button !== 0) return;
  pressed = true;
  el?.classList.add('down');
  paint();
}
function onUp() {
  pressed = false;
  el?.classList.remove('down');
  paint();
}
function onLeave(e) {
  // 창 밖으로 나가거나, 유튜브 같은 끼워 넣은 화면(iframe) 위로 가면 숨김
  if (!e.relatedTarget || e.relatedTarget.tagName === 'IFRAME') el?.classList.remove('on');
}

function bind() {
  if (bound) return;
  bound = true;
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });
  window.addEventListener('blur', onUp);
  document.addEventListener('mouseout', onLeave);
}
function unbind() {
  if (!bound) return;
  bound = false;
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerdown', onDown);
  window.removeEventListener('pointerup', onUp);
  window.removeEventListener('blur', onUp);
  document.removeEventListener('mouseout', onLeave);
}

function turnOff() {
  unbind();
  stopFrames();
  clearTimeout(stopTimer);
  moving = false;
  pressed = false;
  ready = false;
  document.body.classList.remove('has-custom-cursor', 'cursor-text');
  el?.remove();
  el = null;
}

/** 설정이 바뀔 때마다 호출 — 커서를 켜고 끄거나 이미지를 바꿈 */
export async function syncCursor(settings) {
  const c = settings || {};
  const my = ++token;
  normalUrl = safeUrl(c.normal) || '';
  clickUrl = safeUrl(c.click) || '';
  if (!c.on || !normalUrl || !fine()) return turnOff();

  // 기본 예시 그림을 쓸 때만 움직이는 애니메이션(2~6번)을 재생
  frames = normalUrl === EXAMPLE_CURSOR && !reduced() ? EXAMPLE_MOVE : [];
  const ok = await preload(normalUrl);
  if (my !== token) return;
  if (!ok) return turnOff(); // 이미지를 못 불러오면 원래 커서 사용
  [clickUrl, ...frames].forEach(preload);

  if (!el) {
    el = document.createElement('img');
    el.className = 'custom-cursor';
    el.alt = '';
    el.setAttribute('aria-hidden', 'true');
    el.draggable = false;
    document.body.append(el);
  }
  const size = Math.max(16, Math.min(128, Number(c.size) || 48));
  el.style.width = size + 'px';
  el.style.height = size + 'px';
  // 클릭 지점(뾰족한 끝) 위치: 그림 크기에 대한 비율(%)
  el.style.marginLeft = -(size * (Number(c.hotX) || 0)) / 100 + 'px';
  el.style.marginTop = -(size * (Number(c.hotY) || 0)) / 100 + 'px';
  ready = true;
  document.body.classList.add('has-custom-cursor');
  place();
  paint();
  bind();
}

export const cursorReady = () => ready;

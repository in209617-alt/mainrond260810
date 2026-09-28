// ─────────────────────────────────────────────────────────────
// dom.js — 화면 요소(HTML 태그)를 코드로 만드는 작은 도우미 모음
// 예) h('div', { class: 'box' }, '안녕')  →  <div class="box">안녕</div>
// ─────────────────────────────────────────────────────────────

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'class') el.className = Array.isArray(value) ? value.filter(Boolean).join(' ') : value;
      else if (key === 'style' && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) {
          if (v === undefined || v === null) continue;
          if (k.startsWith('--')) el.style.setProperty(k, v);
          else el.style[k] = v;
        }
      } else if (key === 'dataset') Object.assign(el.dataset, value);
      else if (key === 'ref') value(el);
      else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
      else if (key === 'value') el.value = value;
      else if (key === 'checked') el.checked = !!value;
      else if (key === 'text') el.textContent = value;
      else if (value === true) el.setAttribute(key, '');
      else el.setAttribute(key, value);
    }
  }
  append(el, children);
  return el;
}

export function append(el, ...children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false || child === true) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

/** 안의 내용을 모두 바꾸기 (false/null 은 건너뜀) */
export function fill(el, ...children) {
  el.replaceChildren();
  return append(el, ...children);
}

/** SVG 요소 만들기 */
export function svg(tag, attrs = {}, ...children) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  children.flat().forEach((c) => c && el.append(c));
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** 사용자가 입력한 주소 중 안전한 것만 허용 (javascript: 같은 위험한 주소 차단) */
export function safeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const u = url.trim();
  if (/^(https?:|blob:)/i.test(u)) return u;
  if (/^data:image\//i.test(u) || /^data:audio\//i.test(u)) return u;
  if (/^(\.\/|\/|assets\/)/.test(u)) return u;
  return '';
}

export function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj ?? null));
}

/** 기본값(defaults) 위에 저장된 값(saved)을 덮어씌움. 새로 생긴 설정 항목도 기본값으로 채워짐 */
export function deepMerge(defaults, saved) {
  if (Array.isArray(defaults)) return Array.isArray(saved) ? saved : defaults;
  if (typeof defaults !== 'object' || defaults === null) return saved === undefined ? defaults : saved;
  const out = { ...defaults };
  if (saved && typeof saved === 'object') {
    for (const key of Object.keys(saved)) out[key] = key in defaults ? deepMerge(defaults[key], saved[key]) : saved[key];
  }
  return out;
}

export function pad(n, len = 2) {
  return String(n).padStart(len, '0');
}

/** '2026-08-10' → '2026.08.10' */
export function fmtDate(value) {
  if (!value) return '';
  const d = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseLocalDate(value) : new Date(value);
  if (isNaN(d)) return '';
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

export function parseLocalDate(str) {
  const [y, m, d] = String(str).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * 아주 간단한 글 서식: **굵게**, *기울임*, ~~취소선~~, [링크](https://...)
 * 먼저 모든 글자를 안전하게 바꾼 뒤(escape) 서식만 적용하므로 안전합니다.
 */
export function richText(text) {
  const esc = String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const html = esc
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n/g, '<br>');
  const span = document.createElement('span');
  span.innerHTML = html;
  return span;
}

/** 이미지가 화면에 들어올 때 부드럽게 나타나는 효과 */
let revealObserver;
export function reveal(el) {
  if (!('IntersectionObserver' in window)) return el;
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            revealObserver.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px' }
    );
  }
  el.classList.add('reveal');
  revealObserver.observe(el);
  return el;
}

/** 이미지 태그 (주소가 없거나 깨지면 자리표시 표시) */
export function img(src, props = {}) {
  const url = safeUrl(src);
  if (!url) return h('div', { class: ['img-empty', props.class], 'aria-label': props.alt || '이미지 없음' }, h('span', null, props.emptyLabel || 'NO IMAGE'));
  const el = h('img', { loading: 'lazy', decoding: 'async', alt: '', ...props, src: url });
  el.addEventListener('error', () => el.classList.add('img-broken'), { once: true });
  return el;
}

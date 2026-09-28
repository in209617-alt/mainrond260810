// ─────────────────────────────────────────────────────────────
// router.js — 주소(#/p/series 등)를 보고 어떤 화면을 보여줄지 정함
// GitHub Pages에서도 새로고침 시 404가 나지 않도록 '#' 방식 주소를 사용합니다.
// ─────────────────────────────────────────────────────────────

const listeners = new Set();

export function currentRoute() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart = ''] = raw.split('?');
  const parts = pathPart.split('/').filter(Boolean).map(decodeURIComponent);
  return { path: '/' + parts.join('/'), parts, query: Object.fromEntries(new URLSearchParams(queryPart)) };
}

export function navigate(path, { replace = false } = {}) {
  const target = '#' + (path.startsWith('/') ? path : '/' + path);
  if (replace) {
    history.replaceState(null, '', location.pathname + location.search + target);
    emit();
  } else if (location.hash === target) {
    emit();
  } else {
    location.hash = target;
  }
}

export function link(path) {
  return '#' + (path.startsWith('/') ? path : '/' + path);
}

export function onRoute(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  const r = currentRoute();
  listeners.forEach((fn) => fn(r));
}

window.addEventListener('hashchange', emit);
export const refreshRoute = emit;

/** 페이지 주소용 이름(slug) */
export function pagePath(page) {
  if (!page || page.type === 'home' || !page.slug) return '/';
  return '/p/' + encodeURIComponent(page.slug);
}

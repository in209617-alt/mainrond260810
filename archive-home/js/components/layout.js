// ─────────────────────────────────────────────────────────────
// layout.js — 모든 페이지에 공통으로 들어가는 머리글(메뉴)과 바닥글
// 메뉴는 데이터베이스의 pages 표에서 읽어오므로 관리자 페이지에서 이름/순서를 바꾸면 바로 반영됩니다.
// ─────────────────────────────────────────────────────────────
import { h, fmtDate, todayISO, fill } from '../core/dom.js';
import { store } from '../core/store.js';
import { link, pagePath, currentRoute } from '../core/router.js';

export function renderHeader(root) {
  const s = store.settings.site;
  const route = currentRoute();
  const inAdmin = route.parts[0] === 'admin';
  const activeSlug = route.parts[0] === 'p' ? route.parts[1] : route.parts.length === 0 ? '' : null;
  const menu = store.pages.filter((p) => p.visible);

  const nav = h(
    'nav',
    { class: 'site-nav', id: 'site-nav', 'aria-label': '메인 메뉴' },
    menu.map((p, i) =>
      h('a', { class: ['nav-tab', !inAdmin && (p.slug || '') === activeSlug && 'active'], href: link(pagePath(p)), onclick: () => root.classList.remove('nav-open') }, h('span', { class: 'nav-no' }, String(i + 1).padStart(2, '0')), h('span', { class: 'nav-name' }, p.title))
    )
  );

  const right = store.user
    ? h('div', { class: 'head-user' }, store.canEdit && h('a', { class: 'head-link', href: link('/admin') }, '관리'), h('button', { class: 'head-link', onclick: () => store.api.signOut() }, '로그아웃'))
    : h('div', { class: 'head-user' });

  fill(root, 
    h(
      'div',
      { class: 'masthead' },
      h('div', { class: 'mast-meta mast-left' }, h('span', null, s.masthead), h('span', { class: 'mast-date' }, fmtDate(todayISO()))),
      h('a', { class: 'mast-title', href: link('/') }, s.title),
      h('div', { class: 'mast-meta mast-right' }, right, h('button', { class: 'nav-toggle', 'aria-controls': 'site-nav', 'aria-label': '메뉴 열기', onclick: () => root.classList.toggle('nav-open') }, h('span'), h('span'), h('span')))
    ),
    nav
  );
}

export function renderFooter(root) {
  const s = store.settings.site;
  fill(root, 
    h(
      'div',
      { class: 'foot-inner' },
      h('span', { class: 'foot-title' }, s.title),
      h('span', { class: 'foot-line' }, s.footer),
      h('span', { class: 'foot-links' }, store.user ? h('a', { href: link('/admin') }, '관리자 페이지') : h('a', { href: link('/login') }, '편집자 로그인'), store.api?.mode === 'demo' ? h('span', { class: 'demo-flag' }, 'DEMO') : null)
    )
  );
}

/** 각 페이지 맨 위의 제목 영역 */
export function pageHeader(page, { kicker, extra } = {}) {
  const idx = store.pages.filter((p) => p.visible).findIndex((p) => p.id === page.id);
  return h(
    'header',
    { class: 'page-head' },
    h('div', { class: 'page-kicker' }, kicker || `FILE No. ${String(Math.max(idx, 0) + 1).padStart(2, '0')}`),
    h('h1', { class: 'page-title' }, page.title),
    page.description && h('p', { class: 'page-desc' }, page.description),
    extra
  );
}

/** 편집 권한이 있을 때 오른쪽 아래에 뜨는 "편집" 버튼 */
export function editFab(href, label = '이 페이지 편집') {
  if (!store.canEdit) return null;
  return h('a', { class: 'edit-fab', href }, '✎ ', label);
}

// ─────────────────────────────────────────────────────────────
// layout.js — 모든 페이지에 공통으로 들어가는 머리글(메뉴)과 바닥글
// 메뉴는 데이터베이스의 pages 표에서 읽어오므로 관리자 페이지에서 이름/순서를 바꾸면 바로 반영됩니다.
// ─────────────────────────────────────────────────────────────
import { h, fmtDate, todayISO, fill, safeUrl } from '../core/dom.js';
import { store } from '../core/store.js';
import { link, pagePath, currentRoute } from '../core/router.js';
import { musicToggleButton } from './music.js';
import { icon, PAGE_ICON } from './icons.js';

let musicBtnCleanup = null;

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
      h('a', { class: ['nav-tab', !inAdmin && (p.slug || '') === activeSlug && 'active'], href: link(pagePath(p)), onclick: () => root.classList.remove('nav-open') }, icon(PAGE_ICON[p.type] || 'leaf', 'nav-ico'), h('span', { class: 'nav-no' }, String(i + 1).padStart(2, '0')), h('span', { class: 'nav-name' }, p.title))
    )
  );

  const right = store.user
    ? h('div', { class: 'head-user' }, store.canEdit && h('a', { class: 'head-link', href: link('/admin') }, '관리'), h('button', { class: 'head-link', onclick: () => store.api.signOut() }, '로그아웃'))
    : h('div', { class: 'head-user' });

  musicBtnCleanup?.();
  const musicBtn = musicToggleButton();
  musicBtnCleanup = musicBtn._cleanup;

  // 왼쪽 메뉴 아래: 두 캐릭터가 제자리걸음 하는 "PARTY" 칸 (캐릭터 공간의 걷기 이미지를 그대로 사용)
  const stage = store.settings.home.stage || {};
  const names = (store.settings.home.duo?.items || []).map((c) => c.name);
  const party = h('div', { class: 'side-party', 'aria-hidden': 'true' },
    h('div', { class: 'party-title' }, 'PARTY'),
    h('div', { class: 'party-row' }, (stage.chars || []).slice(0, 2).map((c, i) => {
      const fw = Number(c.fw) || 16;
      const fh = Number(c.fh) || 24;
      const frames = Number(c.frames) || 4;
      const url = safeUrl(c.sheet);
      return h('div', { class: 'party-member' },
        url && h('span', { class: 'party-sprite', style: { '--w': fw + 'px', '--h': fh + 'px', '--n': frames, '--delay': `${-i * 0.3}s`, backgroundImage: `url("${url}")` } }),
        h('span', { class: 'party-name' }, names[i] || c.name || ''));
    })),
    h('div', { class: 'party-hp' }, h('span', null, 'LV. ♥'), h('i', { style: { '--hp': '100%' } })));

  fill(root, 
    h(
      'div',
      { class: 'masthead' },
      h('div', { class: 'mast-meta mast-left' }, h('span', null, s.masthead), h('span', { class: 'mast-date' }, fmtDate(todayISO()))),
      h('a', { class: 'mast-title', href: link('/') }, h('span', { class: 'mast-welcome' }, 'Welcome to'), h('span', { class: 'mast-name' }, s.title)),
      h('div', { class: 'mast-meta mast-right' }, musicBtn, right, h('button', { class: 'nav-toggle', 'aria-controls': 'site-nav', 'aria-label': '메뉴 열기', onclick: () => root.classList.toggle('nav-open') }, h('span'), h('span'), h('span')))
    ),
    nav,
    party
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

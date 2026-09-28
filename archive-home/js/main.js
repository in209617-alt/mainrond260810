// ─────────────────────────────────────────────────────────────
// main.js — 홈페이지가 시작되는 곳
// 1) 데이터베이스 연결 → 2) 설정·메뉴 불러오기 → 3) 주소에 맞는 화면 그리기
// ─────────────────────────────────────────────────────────────
import { h, $, fill } from './core/dom.js';
import { store, subscribe, initApi, loadSettings, loadPages, refreshAuth, findPage, homePage } from './core/store.js';
import { onRoute, currentRoute, navigate, link } from './core/router.js';
import { applyTheme } from './core/theme.js';
import { renderHeader, renderFooter } from './components/layout.js';
import { spinner, toast } from './components/ui.js';

const header = $('#site-header');
const main = $('#main');
const footer = $('#site-footer');
let cleanup = null;
let renderToken = 0;

const PAGE_MODULES = {
  home: () => import('./pages/home.js'),
  papers: () => import('./pages/papers.js'),
  series: () => import('./pages/series.js'),
  gallery: () => import('./pages/gallery.js'),
  log: () => import('./pages/log.js'),
  custom: () => import('./pages/custom.js'),
};

async function render(route = currentRoute()) {
  const token = ++renderToken;
  if (cleanup) {
    try { cleanup(); } catch { /* 무시 */ }
    cleanup = null;
  }
  const inAdmin = route.parts[0] === 'admin';
  document.body.classList.toggle('is-admin', inAdmin);
  renderHeader(header);
  renderFooter(footer);

  const view = h('div', { class: 'view' });
  fill(main, view);
  view.append(spinner());

  try {
    let result;
    if (inAdmin) {
      const m = await import('./admin/admin.js');
      if (token !== renderToken) return;
      fill(view);
      result = await m.renderAdmin(view, route);
    } else if (route.parts[0] === 'login') {
      const m = await import('./pages/login.js');
      fill(view);
      result = await m.renderLogin(view, route);
    } else {
      const page = route.parts.length === 0 ? homePage() : route.parts[0] === 'p' ? findPage(route.parts[1]) : null;
      if (!store.pages.length) {
        fill(view, emptySite());
        return;
      }
      if (!page) {
        fill(view, notFound());
        return;
      }
      document.title = page.type === 'home' ? store.settings.site.title : `${page.title} · ${store.settings.site.title}`;
      const loader = PAGE_MODULES[page.type] || PAGE_MODULES.custom;
      const m = await loader();
      if (token !== renderToken) return;
      const holder = h('div');
      result = await m.render(holder, page, route);
      if (token !== renderToken) {
        if (typeof result === 'function') result();
        return;
      }
      fill(view, ...holder.childNodes);
    }
    if (typeof result === 'function') cleanup = result;
    view.classList.add('view-in');
  } catch (e) {
    console.error(e);
    fill(view, h('div', { class: 'notice notice-error' }, h('b', null, '화면을 불러오지 못했어요.'), h('p', null, e.message)));
  }
}

function notFound() {
  return h('div', { class: 'notice' }, h('div', { class: 'page-kicker' }, 'ERROR 404 · MISSING FILE'), h('h1', { class: 'page-title' }, '찾을 수 없는 기록'), h('p', null, '주소가 바뀌었거나 삭제된 페이지예요.'), h('a', { class: 'btn', href: link('/') }, '메인으로'));
}

function emptySite() {
  return h(
    'div',
    { class: 'notice' },
    h('div', { class: 'page-kicker' }, 'ARCHIVE NOT READY'),
    h('h1', { class: 'page-title' }, '아직 준비 중인 자료실'),
    store.canEdit
      ? [h('p', null, '데이터베이스가 비어 있어요. 관리자 페이지에서 [기본 콘텐츠 넣기]를 눌러 시작하세요.'), h('a', { class: 'btn btn-primary', href: link('/admin') }, '관리자 페이지로')]
      : h('p', null, '곧 공개될 예정입니다.')
  );
}

async function boot() {
  fill(main, spinner('자료실을 여는 중…'));
  try {
    await initApi();
    await Promise.all([loadSettings(), loadPages(), refreshAuth()]);
  } catch (e) {
    console.error(e);
    fill(main, h('div', { class: 'notice notice-error' }, h('b', null, '데이터베이스에 연결하지 못했어요.'), h('p', null, e.message), h('p', { class: 'muted' }, 'config.js 의 주소와 키, README의 "schema.sql 실행" 단계를 확인해 주세요.')));
    return;
  }
  applyTheme(store.settings.theme);
  if (store.api.mode === 'demo') document.body.classList.add('is-demo');
  if (store.api.loginError) toast('로그인 실패: ' + store.api.loginError + ' (로그인 요청한 같은 브라우저에서 링크를 열어주세요)', 'error', 8000);

  // 로그인 상태가 바뀌면 권한을 다시 확인하고 화면을 다시 그림
  let lastUser = store.user?.id ?? null;
  store.api.onAuthChange(async (user) => {
    const id = user?.id ?? null;
    if (id === lastUser) return;
    lastUser = id;
    await refreshAuth(user);
    const after = localStorage.getItem('afterLogin');
    if (user && after) {
      localStorage.removeItem('afterLogin');
      navigate(after);
    } else render();
  });
  if (store.user && localStorage.getItem('afterLogin')) {
    const after = localStorage.getItem('afterLogin');
    localStorage.removeItem('afterLogin');
    navigate(after, { replace: true });
  }

  subscribe((what) => {
    if (what === 'settings') applyTheme(store.settings.theme);
    if (what === 'settings' || what === 'pages') {
      renderHeader(header);
      renderFooter(footer);
    }
  });
  onRoute((r) => {
    window.scrollTo(0, 0);
    render(r);
  });
  render();
}

boot();

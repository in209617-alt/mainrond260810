// ─────────────────────────────────────────────────────────────
// admin.js — 관리자 페이지(#/admin)의 뼈대: 왼쪽 메뉴 + 오른쪽 편집 화면
// 로그인하지 않았거나 승인되지 않은 이메일이면 편집 화면을 보여주지 않습니다.
// (화면을 숨기는 것과 별개로, 실제 저장 권한은 데이터베이스 보안 규칙이 서버에서 막습니다.)
// ─────────────────────────────────────────────────────────────
import { h, append } from '../core/dom.js';
import { store, seedDatabase, loadSettings } from '../core/store.js';
import { link } from '../core/router.js';
import { PAGE_TYPES } from '../data/seed.js';
import { toast, toastError, busy, confirmDialog } from '../components/ui.js';

const SECTIONS = {
  '': { label: '대시보드', load: async () => ({ render: renderDashboard }) },
  site: { label: '사이트 정보', load: () => import('./settings.js').then((m) => ({ render: m.renderSite })) },
  design: { label: '디자인 (색상·글꼴)', load: () => import('./settings.js').then((m) => ({ render: m.renderDesign })) },
  home: { label: '메인 화면', load: () => import('./settings.js').then((m) => ({ render: m.renderHomeSettings })) },
  pages: { label: '메뉴 · 페이지', load: () => import('./pages.js').then((m) => ({ render: m.renderPages })) },
  page: { label: '페이지 편집', hidden: true, load: () => import('./pages.js').then((m) => ({ render: m.renderPageEditor })) },
  series: { label: '시리즈 편집', hidden: true, load: () => import('./content.js').then((m) => ({ render: m.renderSeriesEditor })) },
  post: { label: '글 편집', hidden: true, load: () => import('./content.js').then((m) => ({ render: m.renderPostEditor })) },
  media: { label: '이미지 보관함', load: () => import('./media.js').then((m) => ({ render: m.renderMedia })) },
  editors: { label: '편집자 관리', adminOnly: true, load: () => import('./media.js').then((m) => ({ render: m.renderEditors })) },
};

export async function renderAdmin(root, route) {
  document.title = '관리자 · ' + store.settings.site.title;
  if (!store.user) {
    const m = await import('../pages/login.js');
    return m.renderLogin(root, route);
  }
  if (!store.canEdit) {
    append(root, h('div', { class: 'notice' },
      h('div', { class: 'page-kicker' }, 'VIEWER'),
      h('h1', { class: 'page-title' }, '편집 권한이 없어요'),
      h('p', null, `${store.user.email} 은(는) 아직 승인되지 않은 이메일입니다.`),
      h('p', { class: 'muted' }, '관리자에게 이 이메일을 편집자로 추가해 달라고 요청하세요. 추가된 뒤 새로고침하면 편집할 수 있어요.'),
      h('div', { class: 'row-end' }, h('button', { class: 'btn', onclick: () => location.reload() }, '새로고침'), h('button', { class: 'btn', onclick: () => store.api.signOut() }, '로그아웃'))));
    return;
  }

  const key = route.parts[1] || '';
  const section = SECTIONS[key] || SECTIONS[''];
  if (section.adminOnly && !store.isAdmin) {
    append(root, h('div', { class: 'notice' }, h('h1', { class: 'page-title' }, '관리자만 볼 수 있어요')));
    return;
  }

  const content = h('div', { class: 'admin-content' });
  append(root, h('div', { class: 'admin' }, sidebar(key, route), content));
  const mod = await section.load();
  return mod.render(content, route);
}

function sidebar(key, route) {
  const item = (k, label, href = link('/admin' + (k ? '/' + k : ''))) => h('a', { class: ['side-link', key === k && 'active'], href }, label);
  const contentPages = store.pages.filter((p) => p.type !== 'home');
  const currentPageId = key === 'page' ? route.parts[2] : null;
  return h('aside', { class: 'admin-side' },
    h('div', { class: 'side-user' },
      h('span', { class: 'label' }, store.role === 'admin' ? 'ADMIN' : 'EDITOR'),
      h('span', { class: 'side-email' }, store.user.email),
      store.api.mode === 'demo' && h('span', { class: 'demo-flag' }, 'DEMO')),
    h('nav', { class: 'side-nav' },
      h('div', { class: 'side-group' }, '설정'),
      item('', '대시보드'), item('site', '사이트 정보'), item('design', '디자인 (색상·글꼴)'), item('home', '메인 화면'), item('pages', '메뉴 · 페이지'),
      h('div', { class: 'side-group' }, '콘텐츠'),
      contentPages.map((p) => h('a', { class: ['side-link', currentPageId === p.id && 'active'], href: link('/admin/page/' + p.id) }, h('span', { class: 'side-type' }, PAGE_TYPES[p.type]?.label.split(' ')[0] || ''), p.title)),
      h('div', { class: 'side-group' }, '관리'),
      item('media', '이미지 보관함'),
      store.isAdmin && item('editors', '편집자 관리'),
      h('a', { class: 'side-link side-out', href: link('/') }, '↗ 홈페이지 보기'),
      h('button', { class: 'side-link side-out', onclick: () => store.api.signOut() }, '로그아웃')));
}

async function renderDashboard(root) {
  const empty = !store.pages.length;
  const card = (title, desc, href) => h('a', { class: 'dash-card', href }, h('b', null, title), h('span', null, desc));
  append(root, 
    h('h1', { class: 'admin-title' }, '대시보드'),
    store.api.mode === 'demo' && h('div', { class: 'admin-note warn' },
      h('b', null, '지금은 데모 모드입니다. '),
      '수정한 내용은 이 브라우저에만 임시 저장되고 다른 사람에게 보이지 않아요. README의 안내대로 Supabase를 연결하면 실제 데이터베이스에 저장됩니다.',
      h('div', { class: 'row', style: { marginTop: '10px' } }, h('button', { class: 'btn btn-sm', onclick: async () => { if (await confirmDialog('데모 데이터를 처음 상태로 되돌릴까요?', { danger: true, ok: '초기화' })) { store.api.resetDemo(); location.reload(); } } }, '데모 초기화'))),
    empty && h('div', { class: 'admin-note' },
      h('b', null, '데이터베이스가 비어 있어요. '),
      '아래 버튼을 누르면 기본 페이지(메인·등장인물·시리즈·갤러리·로그)와 예시 내용이 만들어집니다. 모두 나중에 자유롭게 고치거나 지울 수 있어요.',
      h('div', { class: 'row', style: { marginTop: '10px' } }, h('button', {
        class: 'btn btn-primary',
        onclick: (e) => busy(e.currentTarget, async () => {
          try {
            await seedDatabase();
            await loadSettings();
            toast('기본 콘텐츠를 넣었어요!', 'success');
            location.hash = '#/admin';
          } catch (err) { toastError(err); }
        }, '넣는 중…'),
      }, '기본 콘텐츠 넣기'))),
    h('p', { class: 'admin-lead' }, '무엇을 바꾸고 싶나요? 모든 변경은 코드 수정 없이 여기서 할 수 있어요.'),
    h('div', { class: 'dash-grid' },
      card('사이트 정보', '사이트 제목, 설명, 바닥글 문구', link('/admin/site')),
      card('디자인', '메인·보조·포인트·배경·글자 색, 글꼴, 배경 이미지', link('/admin/design')),
      card('메인 화면', '대표 이미지, D-Day, 음악, 두 캐릭터, 캐릭터 공간, 구역 순서', link('/admin/home')),
      card('메뉴 · 페이지', '메뉴 이름·순서·표시 여부, 페이지 추가/삭제', link('/admin/pages')),
      ...store.pages.filter((p) => p.type !== 'home').map((p) => card(p.title, PAGE_TYPES[p.type]?.help || '', link('/admin/page/' + p.id))),
      card('이미지 보관함', '올린 이미지 모아보기·삭제', link('/admin/media')),
      store.isAdmin && card('편집자 관리', '편집 권한을 줄 이메일 추가/삭제', link('/admin/editors'))),
    h('p', { class: 'admin-foot' }, '홈페이지 주소: ', h('a', { href: location.origin + location.pathname, target: '_blank' }, location.origin + location.pathname), ' · 관리자 페이지: ', h('code', null, location.origin + location.pathname + '#/admin')));
}

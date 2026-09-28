// ─────────────────────────────────────────────────────────────
// pages.js — 관리자: 메뉴·페이지 관리 + 페이지별 편집 화면
// 메뉴 = pages 표. 이름을 바꾸면 홈페이지 메뉴에 바로 반영됩니다.
// ─────────────────────────────────────────────────────────────
import { h, clone, append, fill } from '../core/dom.js';
import { store, loadPages } from '../core/store.js';
import { link, navigate, pagePath } from '../core/router.js';
import { PAGE_TYPES } from '../data/seed.js';
import { field, textInput, textArea, toggle, selectInput, imageField } from '../components/fields.js';
import { makeSortable } from '../components/sortable.js';
import { toast, toastError, busy, confirmDialog, modal } from '../components/ui.js';
import { blockEditor } from '../components/blocks.js';

const group = (title, ...children) => h('fieldset', { class: 'group' }, h('legend', null, title), ...children);

export function makeSlug(title) {
  const ascii = String(title || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return ascii || 'page-' + Math.random().toString(36).slice(2, 6);
}
const validSlug = (s) => /^[a-z0-9][a-z0-9-]{0,40}$/.test(s);

async function updatePage(id, patch) {
  await store.api.update('pages', id, patch);
  await loadPages();
}

/* ───────── 메뉴 · 페이지 목록 ───────── */
export async function renderPages(root) {
  const list = h('div', { class: 'sort-list' });
  const sorter = makeSortable(list, {
    onEnd: async (ids) => {
      try {
        await store.api.reorder('pages', ids);
        await loadPages();
        toast('메뉴 순서를 저장했어요', 'success');
      } catch (e) { toastError(e); }
    },
  });

  function paint() {
    fill(list, ...store.pages.map((p) => {
      const saveField = (key, transform = (v) => v) => async (e) => {
        const value = transform(e.target.value.trim());
        if (key === 'title' && !value) return toast('이름을 비울 수 없어요', 'error');
        if (key === 'slug' && !validSlug(value)) { e.target.value = p.slug; return toast('주소는 영어 소문자·숫자·하이픈(-)만 쓸 수 있어요', 'error'); }
        try { await updatePage(p.id, { [key]: value }); toast('저장했어요', 'success'); } catch (err) { toastError(err); }
      };
      const row = h('div', { class: ['sort-item', 'page-row', !p.visible && 'off'], dataset: { id: p.id } },
        h('span', { class: 'drag-handle', title: '끌어서 순서 바꾸기' }, '⋮⋮'),
        h('div', { class: 'page-row-main' },
          h('input', { class: 'input input-title', value: p.title, 'aria-label': '메뉴 이름', onchange: saveField('title') }),
          h('div', { class: 'page-row-meta' },
            h('span', { class: 'type-badge' }, PAGE_TYPES[p.type]?.label || p.type),
            p.type === 'home' ? h('span', { class: 'muted' }, '주소: /') : h('label', { class: 'slug' }, '주소: /p/', h('input', { class: 'input input-slug', value: p.slug, onchange: saveField('slug', (v) => v.toLowerCase()) })))),
        toggle('메뉴에 표시', p.visible, async (v) => { try { await updatePage(p.id, { visible: v }); row.classList.toggle('off', !v); } catch (e) { toastError(e); } }),
        h('div', { class: 'row' },
          h('button', { class: 'btn-icon', title: '위로', onclick: () => sorter.move(row, -1) }, '↑'),
          h('button', { class: 'btn-icon', title: '아래로', onclick: () => sorter.move(row, 1) }, '↓'),
          h('a', { class: 'btn btn-sm', href: p.type === 'home' ? link('/admin/home') : link('/admin/page/' + p.id) }, '내용 편집'),
          p.type !== 'home' && h('button', { class: 'btn btn-sm btn-danger', onclick: () => deletePage(p) }, '삭제')));
      return row;
    }));
  }

  async function deletePage(p) {
    if (!(await confirmDialog(`"${p.title}" 페이지를 삭제할까요?\n이 페이지 안의 글·시리즈·갤러리 목록도 함께 삭제되며 되돌릴 수 없어요.`, { ok: '삭제', danger: true }))) return;
    try {
      await store.api.remove('pages', p.id);
      await loadPages();
      paint();
      toast('삭제했어요');
    } catch (e) { toastError(e); }
  }

  append(root, 
    h('h1', { class: 'admin-title' }, '메뉴 · 페이지'),
    h('p', { class: 'admin-lead' }, '이름을 고치고 칸 밖을 누르면 바로 저장돼요. ⋮⋮ 를 끌어서 메뉴 순서를 바꿀 수 있어요.'),
    h('div', { class: 'row', style: { marginBottom: '14px' } }, h('button', { class: 'btn btn-primary', onclick: newPageDialog }, '+ 새 페이지 추가')),
    list);
  paint();
}

function newPageDialog() {
  const d = { title: '', description: '', type: 'custom', slug: '', cover: '' };
  let slugTouched = false;
  const slugInput = h('input', { class: 'input', placeholder: '예) diary', oninput: (e) => { slugTouched = true; d.slug = e.target.value.trim().toLowerCase(); } });
  const help = h('p', { class: 'field-help' }, PAGE_TYPES.custom.help);
  const content = h('div', { class: 'stack' },
    field('페이지 이름 (메뉴에 보이는 이름)', textInput('', (v) => { d.title = v; if (!slugTouched) { d.slug = makeSlug(v); slugInput.value = d.slug; } }, { placeholder: '예) 일기장' })),
    field('페이지 설명', textInput('', (v) => (d.description = v), { placeholder: '제목 아래 작게 표시돼요' })),
    field('페이지 종류', selectInput(Object.entries(PAGE_TYPES).filter(([k]) => k !== 'home').map(([k, v]) => [k, v.label]), 'custom', (v) => { d.type = v; help.textContent = PAGE_TYPES[v].help; })),
    help,
    field('주소 (영어 소문자·숫자·-)', slugInput),
    imageField('대표 이미지 (선택)', '', (v) => (d.cover = v), { folder: 'pages', small: true }),
    h('div', { class: 'row-end' }, h('button', {
      class: 'btn btn-primary',
      onclick: (e) => busy(e.currentTarget, async () => {
        if (!d.title.trim()) return toast('페이지 이름을 입력하세요', 'error');
        if (!d.slug) d.slug = makeSlug(d.title);
        if (!validSlug(d.slug)) return toast('주소는 영어 소문자·숫자·하이픈(-)만 쓸 수 있어요', 'error');
        try {
          const row = await store.api.insert('pages', { title: d.title.trim(), description: d.description, type: d.type, slug: d.slug, cover: d.cover, visible: true, sort_order: store.pages.length, content: {} });
          if (d.type === 'gallery') await store.api.insert('gallery_categories', { page_id: row.id, name: '기본', sort_order: 0 });
          await loadPages();
          m.close();
          toast('페이지를 만들었어요', 'success');
          navigate('/admin/page/' + row.id);
        } catch (err) { toastError(err); }
      }, '만드는 중…'),
    }, '만들기')));
  const m = modal({ title: '새 페이지 추가', content });
}

/* ───────── 페이지별 편집 ───────── */
export async function renderPageEditor(root, route) {
  const page = store.pages.find((p) => p.id === route.parts[2]);
  if (!page) {
    append(root, h('p', null, '페이지를 찾을 수 없어요. ', h('a', { href: link('/admin/pages') }, '목록으로')));
    return;
  }
  if (page.type === 'home') return navigate('/admin/home', { replace: true });

  const info = clone(page);
  const infoGroup = group('페이지 정보',
    field('페이지 이름 (메뉴 이름)', textInput(info.title, (v) => (info.title = v))),
    field('설명 (제목 아래 작은 글씨)', textInput(info.description, (v) => (info.description = v))),
    imageField('대표 이미지', info.cover, (v) => (info.cover = v), { folder: 'pages', small: true }),
    toggle('메뉴에 표시', info.visible, (v) => (info.visible = v)),
    h('div', { class: 'row-end' }, h('button', {
      class: 'btn btn-primary',
      onclick: (e) => busy(e.currentTarget, async () => {
        if (!info.title.trim()) return toast('이름을 비울 수 없어요', 'error');
        try {
          await updatePage(page.id, { title: info.title.trim(), description: info.description, cover: info.cover, visible: info.visible });
          toast('페이지 정보를 저장했어요', 'success');
        } catch (err) { toastError(err); }
      }),
    }, '페이지 정보 저장')));

  append(root, 
    h('div', { class: 'admin-title-row' },
      h('h1', { class: 'admin-title' }, page.title),
      h('span', { class: 'type-badge' }, PAGE_TYPES[page.type]?.label),
      h('span', { class: 'spacer' }),
      h('a', { class: 'btn btn-sm', href: link(pagePath(page)), target: '_blank' }, '↗ 홈페이지에서 보기')),
    infoGroup);

  if (page.type === 'custom') return customEditor(root, page);
  const m = await import('./content.js');
  const fn = { papers: m.papersManager, series: m.seriesManager, gallery: m.galleryManager, log: m.logManager }[page.type];
  return fn ? fn(root, page) : undefined;
}

function customEditor(root, page) {
  let blocks = clone(page.content?.blocks || []);
  let dirty = false;
  const saveBtn = h('button', { class: 'btn btn-primary', onclick: (e) => busy(e.currentTarget, save) }, '본문 저장');
  async function save() {
    try {
      await updatePage(page.id, { content: { ...(page.content || {}), blocks } });
      dirty = false;
      toast('본문을 저장했어요', 'success');
    } catch (err) { toastError(err); }
  }
  append(root, group('본문', h('p', { class: 'field-help' }, '+ 버튼으로 글·소제목·사진을 원하는 위치에 넣고, ⋮⋮ 를 끌어서 순서를 바꾸세요. 사진 파일을 여기로 끌어다 놓아도 돼요.'),
    blockEditor(blocks, (b) => { blocks = b; dirty = true; }, { folder: 'pages' }),
    h('div', { class: 'row-end sticky-save' }, saveBtn)));
  return () => dirty && save();
}

// ─────────────────────────────────────────────────────────────
// content.js — 관리자: 페이지 종류별 콘텐츠 관리
//   기록철(종이) · 시리즈(DVD) · 갤러리 · 로그(글)
// ─────────────────────────────────────────────────────────────
import { h, img, clone, todayISO, fmtDate, safeUrl, append, fill } from '../core/dom.js';
import { store } from '../core/store.js';
import { link, navigate, pagePath } from '../core/router.js';
import { field, textInput, textArea, colorField, imageField, selectInput, uploadFiles, dropZone } from '../components/fields.js';
import { makeSortable } from '../components/sortable.js';
import { toast, toastError, busy, confirmDialog, spinner } from '../components/ui.js';
import { blockEditor } from '../components/blocks.js';

const group = (title, ...children) => h('fieldset', { class: 'group' }, h('legend', null, title), ...children);

/** 끌어서 순서 바꾸는 목록 + 저장 */
function sortableRows(table, rows, renderRow, onReordered) {
  const list = h('div', { class: 'sort-list' });
  const sorter = makeSortable(list, {
    onEnd: async (ids) => {
      try {
        onReordered?.(ids);
        await store.api.reorder(table, ids);
        toast('순서를 저장했어요', 'success');
      } catch (e) { toastError(e); }
    },
  });
  rows.forEach((r) => {
    const row = h('div', { class: 'sort-item sort-row', dataset: { id: r.id } }, h('span', { class: 'drag-handle', title: '끌어서 순서 바꾸기' }, '⋮⋮'));
    renderRow(r, row, sorter);
    list.append(row);
  });
  return list;
}

/* ───────── 기록철 (등장인물) ───────── */
export async function papersManager(root, page) {
  const box = h('div', null, spinner());
  append(root, group('종이 목록',
    h('p', { class: 'field-help' }, '글상자·사진·장식의 위치와 크기는 실제 페이지 위에서 직접 끌어서 꾸밉니다.'),
    h('div', { class: 'row wrap', style: { marginBottom: '12px' } },
      h('a', { class: 'btn btn-primary', href: link(pagePath(page) + '?edit=1') }, '✎ 페이지에서 직접 꾸미기'),
      h('button', { class: 'btn', onclick: addPaper }, '+ 종이 추가')),
    box));
  async function load() {
    const papers = await store.api.select('papers', { eq: { page_id: page.id } });
    fill(box, papers.length ? sortableRows('papers', papers, (p, row, sorter) => row.append(
      h('div', { class: 'paper-thumb', style: { backgroundImage: p.background ? `url("${safeUrl(p.background)}")` : null } }),
      h('div', { class: 'sort-name' }, h('b', null, p.title || '(이름 없는 종이)'), h('span', { class: 'muted' }, ` · 요소 ${p.elements?.length || 0}개`)),
      h('button', { class: 'btn-icon', title: '위로', onclick: () => sorter.move(row, -1) }, '↑'),
      h('button', { class: 'btn-icon', title: '아래로', onclick: () => sorter.move(row, 1) }, '↓'),
      h('button', { class: 'btn btn-sm btn-danger', onclick: async () => {
        if (!(await confirmDialog('이 종이를 삭제할까요?', { ok: '삭제', danger: true }))) return;
        try { await store.api.remove('papers', p.id); load(); } catch (e) { toastError(e); }
      } }, '삭제'))) : h('p', { class: 'muted' }, '종이가 없어요.'));
  }
  async function addPaper() {
    try {
      const n = box.querySelectorAll('.sort-item').length;
      await store.api.insert('papers', { page_id: page.id, sort_order: n, title: `종이 ${n + 1}`, background: store.settings.paperLibrary[n % 2] || '', aspect: 0.75, elements: [] });
      load();
    } catch (e) { toastError(e); }
  }
  load();
}

/* ───────── 시리즈 (DVD) ───────── */
export async function seriesManager(root, page) {
  const box = h('div', null, spinner());
  append(root, group('시리즈 목록',
    h('div', { class: 'row', style: { marginBottom: '12px' } }, h('button', {
      class: 'btn btn-primary',
      onclick: (e) => busy(e.currentTarget, async () => {
        try {
          const n = box.querySelectorAll('.sort-item').length;
          const row = await store.api.insert('series', { page_id: page.id, sort_order: n, title: '새 시리즈', subtitle: 'NEW SERIES', year: String(new Date().getFullYear()), spine_color: '#2a2622', label_color: '#e4dab9', summary: '', cover: '', blocks: [] });
          navigate('/admin/series/' + row.id);
        } catch (err) { toastError(err); }
      }),
    }, '+ 새 시리즈 추가')),
    box));
  const list = await store.api.select('series', { eq: { page_id: page.id } });
  fill(box, list.length ? sortableRows('series', list, (s, row, sorter) => row.append(
    h('span', { class: 'mini-spine', style: { background: s.spine_color, color: s.label_color } }, s.title.slice(0, 4)),
    h('div', { class: 'mini-cover' }, img(s.cover, { emptyLabel: '—' })),
    h('div', { class: 'sort-name' }, h('b', null, s.title), h('span', { class: 'muted' }, ` · ${s.subtitle || ''} ${s.year || ''}`)),
    h('button', { class: 'btn-icon', title: '위로', onclick: () => sorter.move(row, -1) }, '↑'),
    h('button', { class: 'btn-icon', title: '아래로', onclick: () => sorter.move(row, 1) }, '↓'),
    h('a', { class: 'btn btn-sm', href: link('/admin/series/' + s.id) }, '편집'))) : h('p', { class: 'muted' }, '아직 시리즈가 없어요. [+ 새 시리즈 추가]를 눌러보세요.'));
}

export async function renderSeriesEditor(root, route) {
  const s = await store.api.get('series', route.parts[2]);
  if (!s) return append(root, h('p', null, '시리즈를 찾을 수 없어요.'));
  const page = store.pages.find((p) => p.id === s.page_id);
  let dirty = false;
  const d = clone(s);
  const preview = h('div', { class: 'series-preview' });
  const paintPreview = () => fill(preview, h('div', { class: 'dvd open static', style: { '--spine': d.spine_color, '--label': d.label_color, '--h': 300 } },
    h('div', { class: 'dvd-spine' }, h('span', { class: 'spine-no' }, '00'), h('span', { class: 'spine-title' }, d.title), h('span', { class: 'spine-sub' }, d.subtitle), h('span', { class: 'spine-logo' }, 'DVD')),
    h('div', { class: 'dvd-open' }, h('div', { class: 'dvd-cover' }, d.cover ? img(d.cover) : h('div', { class: 'cover-type' }, h('span', { class: 'cover-sub' }, d.subtitle), h('span', { class: 'cover-title' }, d.title), h('span', { class: 'cover-year' }, d.year))))));
  const ch = (k) => (v) => { d[k] = v; dirty = true; paintPreview(); };
  async function save(quiet) {
    try {
      await store.api.update('series', s.id, { title: d.title, subtitle: d.subtitle, year: d.year, summary: d.summary, cover: d.cover, spine_color: d.spine_color, label_color: d.label_color, blocks: d.blocks });
      dirty = false;
      if (!quiet) toast('저장했어요', 'success');
    } catch (e) { toastError(e); }
  }
  paintPreview();
  append(root, 
    h('a', { class: 'back-admin', href: link('/admin/page/' + s.page_id) }, '← ', page?.title || '시리즈', ' 목록'),
    h('div', { class: 'admin-title-row' }, h('h1', { class: 'admin-title' }, '시리즈 편집'), h('span', { class: 'spacer' }), page && h('a', { class: 'btn btn-sm', target: '_blank', href: link(`${pagePath(page)}/${s.id}`) }, '↗ 보기')),
    h('div', { class: 'series-edit-top' },
      group('DVD 케이스',
        field('제목', textInput(d.title, ch('title'))),
        h('div', { class: 'row wrap' }, field('부제 (영문 추천)', textInput(d.subtitle, ch('subtitle'))), field('연도 / 표기', textInput(d.year, ch('year')))),
        field('짧은 소개 (목록에서 보임)', textArea(d.summary, ch('summary'), { rows: 2 })),
        imageField('대표 이미지 (DVD 표지)', d.cover, ch('cover'), { folder: 'series', small: true, help: '세로로 긴 이미지(약 7:10)가 잘 어울려요.' }),
        h('div', { class: 'row wrap' }, colorField('케이스 색', d.spine_color, ch('spine_color')), colorField('글자 색', d.label_color, ch('label_color')))),
      preview),
    group('상세 페이지 본문', blockEditor(d.blocks, (b) => { d.blocks = b; dirty = true; }, { folder: 'series' })),
    h('div', { class: 'row-end sticky-save' },
      h('button', { class: 'btn btn-danger', onclick: async () => {
        if (!(await confirmDialog('이 시리즈를 삭제할까요?', { ok: '삭제', danger: true }))) return;
        try { await store.api.remove('series', s.id); dirty = false; navigate('/admin/page/' + s.page_id); } catch (e) { toastError(e); }
      } }, '시리즈 삭제'),
      h('button', { class: 'btn btn-primary', onclick: (e) => busy(e.currentTarget, () => save()) }, '저장')));
  return () => dirty && save(true).then(() => toast('자동 저장했어요'));
}

/* ───────── 갤러리 ───────── */
export async function galleryManager(root, page, selectedId) {
  const wrapBox = h('div', { class: 'gallery-admin' }, spinner());
  append(root, wrapBox);
  let cats = await store.api.select('gallery_categories', { eq: { page_id: page.id } });
  let current = cats.find((c) => c.id === selectedId) || cats[0];

  const catBox = h('div');
  const imgBox = h('div');
  fill(wrapBox, group('분류 (카테고리)', h('p', { class: 'field-help' }, '이름을 고치면 바로 저장돼요. 분류를 눌러 그 안의 이미지를 관리하세요.'), catBox), imgBox);

  function paintCats() {
    const list = sortableRows('gallery_categories', cats, (c, row, sorter) => {
      row.classList.toggle('active', c.id === current?.id);
      row.append(
        h('input', { class: 'input', value: c.name, 'aria-label': '분류 이름', onchange: async (e) => {
          const name = e.target.value.trim();
          if (!name) return toast('이름을 비울 수 없어요', 'error');
          try { await store.api.update('gallery_categories', c.id, { name }); c.name = name; toast('저장했어요', 'success'); paintImages(); } catch (err) { toastError(err); }
        } }),
        h('button', { class: ['btn', 'btn-sm', c.id === current?.id && 'btn-primary'], onclick: () => { current = c; paintCats(); paintImages(); } }, '이미지 관리'),
        h('button', { class: 'btn-icon', title: '위로', onclick: () => sorter.move(row, -1) }, '↑'),
        h('button', { class: 'btn-icon', title: '아래로', onclick: () => sorter.move(row, 1) }, '↓'),
        h('button', { class: 'btn-icon danger', title: '분류 삭제', onclick: async () => {
          if (!(await confirmDialog(`"${c.name}" 분류와 안에 있는 이미지 목록을 삭제할까요?`, { ok: '삭제', danger: true }))) return;
          try {
            const imgs = await store.api.select('gallery_images', { eq: { category_id: c.id } });
            for (const im of imgs) await store.api.removeMediaByUrl(im.url).catch(() => {});
            await store.api.remove('gallery_categories', c.id);
            cats = cats.filter((x) => x.id !== c.id);
            if (current?.id === c.id) current = cats[0];
            paintCats();
            paintImages();
          } catch (err) { toastError(err); }
        } }, '✕'));
    }, (ids) => cats.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)));
    fill(catBox, list, h('button', { class: 'btn btn-sm', style: { marginTop: '10px' }, onclick: async () => {
      try {
        const row = await store.api.insert('gallery_categories', { page_id: page.id, name: '새 분류', sort_order: cats.length });
        cats.push(row);
        current = row;
        paintCats();
        paintImages();
      } catch (e) { toastError(e); }
    } }, '+ 분류 추가'));
  }

  async function paintImages() {
    if (!current) return fill(imgBox, group('이미지', h('p', { class: 'muted' }, '먼저 분류를 추가하세요.')));
    fill(imgBox, group(`"${current.name}" 이미지`, spinner()));
    const images = await store.api.select('gallery_images', { eq: { category_id: current.id } });
    const progress = h('div', { class: 'field-help' });
    const zone = dropZone({
      label: '여기로 이미지를 끌어다 놓거나 눌러서 여러 장 한 번에 선택하세요',
      onFiles: async (files) => {
        try {
          const added = [];
          const rows = await uploadFiles(files, { folder: 'gallery', onProgress: (i, total, name) => (progress.textContent = `업로드 중 ${i}/${total} · ${name}`) });
          for (const r of rows) added.push(await store.api.insert('gallery_images', { category_id: current.id, url: r.url, caption: '', sort_order: 0 }));
          // 새로 올린 그림을 맨 앞(위)으로 → 과거 그림은 아래로
          await store.api.reorder('gallery_images', [...added.map((x) => x.id), ...images.map((x) => x.id)]);
          progress.textContent = `${rows.length}장 올렸어요.`;
          paintImages();
        } catch (e) { progress.textContent = ''; toastError(e); }
      },
    });
    const grid = h('div', { class: 'img-grid' });
    makeSortable(grid, { item: '.img-card', onEnd: async (ids) => { try { await store.api.reorder('gallery_images', ids); toast('순서를 저장했어요', 'success'); } catch (e) { toastError(e); } } });
    images.forEach((im) => grid.append(h('div', { class: 'img-card', dataset: { id: im.id } },
      h('div', { class: 'img-card-pic drag-handle', title: '끌어서 순서 바꾸기' }, img(im.url)),
      h('input', { class: 'input', value: im.caption || '', placeholder: '설명 (선택)', onchange: async (e) => { try { await store.api.update('gallery_images', im.id, { caption: e.target.value }); toast('설명을 저장했어요', 'success'); } catch (err) { toastError(err); } } }),
      h('div', { class: 'row' },
        cats.length > 1 && selectInput(cats.map((c) => [c.id, c.name]), current.id, async (v) => { try { await store.api.update('gallery_images', im.id, { category_id: v }); toast('분류를 옮겼어요'); paintImages(); } catch (e) { toastError(e); } }, { 'aria-label': '분류 옮기기' }),
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn-icon danger', title: '이미지 삭제', onclick: async () => {
          if (!(await confirmDialog('이 이미지를 삭제할까요? (저장소에서도 지워집니다)', { ok: '삭제', danger: true }))) return;
          try { await store.api.remove('gallery_images', im.id); await store.api.removeMediaByUrl(im.url); paintImages(); } catch (e) { toastError(e); }
        } }, '🗑')))));
    fill(imgBox, group(`"${current.name}" 이미지 · ${images.length}장`, zone, progress, h('div', { class: 'row wrap' },
      h('p', { class: 'field-help', style: { flex: '1' } }, '새로 올린 그림은 맨 앞(위)에 들어가요. 사진을 끌어서 순서를 바꿀 수 있어요. 홈페이지에서는 이 순서대로 한 줄에 3장씩 보여요.'),
      images.length > 1 && h('button', { class: 'btn btn-sm', onclick: (e) => busy(e.currentTarget, async () => {
        const sorted = [...images].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
        try { await store.api.reorder('gallery_images', sorted.map((x) => x.id)); toast('최근에 올린 그림이 위로 오도록 정렬했어요', 'success'); paintImages(); } catch (err) { toastError(err); }
      }, '정렬 중…') }, '↓ 최신순 정렬 (과거 그림은 아래로)')), images.length ? grid : h('p', { class: 'muted' }, '아직 이미지가 없어요.')));
  }

  paintCats();
  paintImages();
}

/* ───────── 로그 (블로그) ───────── */
export async function logManager(root, page) {
  const box = h('div', null, spinner());
  append(root, group('글 목록',
    h('div', { class: 'row', style: { marginBottom: '12px' } }, h('button', {
      class: 'btn btn-primary',
      onclick: (e) => busy(e.currentTarget, async () => {
        try {
          const row = await store.api.insert('posts', { page_id: page.id, title: '', date: todayISO(), cover: '', excerpt: '', blocks: [{ type: 'text', text: '' }] });
          navigate('/admin/post/' + row.id);
        } catch (err) { toastError(err); }
      }),
    }, '+ 새 글 쓰기')),
    box));
  const posts = await store.api.select('posts', { eq: { page_id: page.id }, order: [['date', false], ['created_at', false]] });
  fill(box, posts.length ? h('div', { class: 'sort-list' }, posts.map((p) => h('div', { class: 'sort-row' },
    h('div', { class: 'mini-cover' }, img(p.cover || p.blocks?.find((b) => b.type === 'image')?.url, { emptyLabel: '—' })),
    h('div', { class: 'sort-name' }, h('b', null, p.title || '(제목 없음)'), h('span', { class: 'muted' }, ' · ' + fmtDate(p.date))),
    h('a', { class: 'btn btn-sm', href: link('/admin/post/' + p.id) }, '편집'),
    h('button', { class: 'btn btn-sm btn-danger', onclick: async (e) => {
      if (!(await confirmDialog(`"${p.title || '제목 없음'}" 글을 삭제할까요?`, { ok: '삭제', danger: true }))) return;
      try { await store.api.remove('posts', p.id); e.target.closest('.sort-row').remove(); toast('삭제했어요'); } catch (err) { toastError(err); }
    } }, '삭제')))) : h('p', { class: 'muted' }, '아직 글이 없어요.'));
}

export async function renderPostEditor(root, route) {
  const p = await store.api.get('posts', route.parts[2]);
  if (!p) return append(root, h('p', null, '글을 찾을 수 없어요.'));
  const page = store.pages.find((x) => x.id === p.page_id);
  const d = clone(p);
  let dirty = false;
  const ch = (k) => (v) => { d[k] = v; dirty = true; };
  async function save(quiet) {
    try {
      await store.api.update('posts', p.id, { title: d.title, date: d.date || todayISO(), cover: d.cover, excerpt: d.excerpt, blocks: d.blocks, updated_at: new Date().toISOString() });
      dirty = false;
      if (!quiet) toast('저장했어요', 'success');
    } catch (e) { toastError(e); }
  }
  append(root, 
    h('a', { class: 'back-admin', href: link('/admin/page/' + p.page_id) }, '← ', page?.title || '로그', ' 목록'),
    h('div', { class: 'admin-title-row' }, h('h1', { class: 'admin-title' }, '글 쓰기'), h('span', { class: 'spacer' }), page && h('a', { class: 'btn btn-sm', target: '_blank', href: link(`${pagePath(page)}/${p.id}`) }, '↗ 보기')),
    h('div', { class: 'post-editor' },
      h('input', { class: 'input post-title-input', value: d.title, placeholder: '제목', oninput: (e) => ch('title')(e.target.value) }),
      h('div', { class: 'row wrap' },
        field('날짜', h('input', { class: 'input', type: 'date', value: d.date, onchange: (e) => ch('date')(e.target.value) })),
        field('목록에 보일 짧은 요약 (선택)', textInput(d.excerpt, ch('excerpt')))),
      imageField('대표 이미지 (목록 썸네일, 선택)', d.cover, ch('cover'), { folder: 'posts', small: true, help: '비워두면 본문 첫 사진을 씁니다.' }),
      h('div', { class: 'field-label', style: { marginTop: '10px' } }, '본문'),
      blockEditor(d.blocks, (b) => { d.blocks = b; dirty = true; }, { folder: 'posts' })),
    h('div', { class: 'row-end sticky-save' },
      h('button', { class: 'btn btn-danger', onclick: async () => {
        if (!(await confirmDialog('이 글을 삭제할까요?', { ok: '삭제', danger: true }))) return;
        try { await store.api.remove('posts', p.id); dirty = false; navigate('/admin/page/' + p.page_id); } catch (e) { toastError(e); }
      } }, '글 삭제'),
      h('button', { class: 'btn btn-primary', onclick: (e) => busy(e.currentTarget, () => save()) }, '저장')));
  return () => dirty && save(true).then(() => toast('자동 저장했어요'));
}

// ─────────────────────────────────────────────────────────────
// papers.js — "기록철" 페이지 (기본 이름: 등장인물)
// 종이 위에 글상자·사진·장식을 자유롭게 배치하는 페이지입니다.
// 편집 권한이 있으면 [편집 모드]에서 바로 끌어서 옮기고, 크기를 바꾸고, 회전할 수 있어요.
// 위치/크기는 종이 크기에 대한 % 로 저장되므로 휴대폰에서도 비율이 유지됩니다.
// ─────────────────────────────────────────────────────────────
import { h, img, uid, clone, reveal, richText, append, fill } from '../core/dom.js';
import { store } from '../core/store.js';
import { pageHeader } from '../components/layout.js';
import { toast, toastError, confirmDialog, busy } from '../components/ui.js';
import { imageField, pickMedia, selectInput, textArea, colorField } from '../components/fields.js';

const FONT_VAR = { title: 'var(--f-title)', body: 'var(--f-body)', label: 'var(--f-label)', hand: 'var(--f-hand)' };
const FONT_NAMES = [['title', '제목 글꼴'], ['body', '본문 글꼴'], ['label', '타자기 글꼴'], ['hand', '손글씨 글꼴']];
const ASPECTS = [['0.707', '세로 (A4)'], ['0.75', '세로 (3:4)'], ['1', '정사각형'], ['1.333', '가로 (4:3)'], ['1.414', '가로 (A4)']];

export async function render(root, page, route) {
  let papers = await store.api.select('papers', { eq: { page_id: page.id } });
  let editing = store.canEdit && route.query.edit === '1';
  let selected = null; // { paperId, elId }
  const dirty = new Set();

  const board = h('div', { class: 'folder-board' });
  const toolbar = h('div', { class: 'paper-toolbar' });
  const inspector = h('aside', { class: 'inspector', 'aria-label': '선택한 요소 설정' });
  const headExtra = store.canEdit ? h('button', { class: 'btn btn-sm edit-toggle', onclick: () => setEditing(!editing) }) : null;

  append(root, h('section', { class: 'wrap papers-page' }, pageHeader(page, { extra: headExtra }), toolbar, h('div', { class: 'folder' }, h('div', { class: 'folder-tab' }, 'FILE · ' + page.title), board), inspector));

  const findPaper = (id) => papers.find((p) => p.id === id);
  const findEl = () => {
    if (!selected) return null;
    return findPaper(selected.paperId)?.elements.find((e) => e.id === selected.elId) ?? null;
  };
  const markDirty = (paperId) => {
    dirty.add(paperId);
    paintToolbar();
  };

  function setEditing(on) {
    editing = on;
    selected = null;
    paintAll();
  }

  /* ───── 요소 그리기 ───── */
  function elNode(paper, e) {
    const style = {
      left: e.x + '%',
      top: e.y + '%',
      width: e.w + '%',
      transform: `rotate(${e.r || 0}deg)`,
      zIndex: e.z || 1,
      opacity: e.opacity ?? 1,
    };
    let inner;
    if (e.type === 'text') {
      Object.assign(style, { '--s': e.size || 3, color: e.color || 'inherit', fontFamily: FONT_VAR[e.font] || FONT_VAR.body, textAlign: e.align || 'left', fontWeight: e.bold ? 700 : 400, minHeight: editing ? e.h + '%' : null });
      inner = h('div', { class: 'el-text-inner' }, richText(e.text || (editing ? '(빈 글상자)' : '')));
    } else {
      style.height = e.h + '%';
      inner = img(e.src, { alt: e.alt || '', emptyLabel: editing ? '사진을 넣어주세요' : 'PHOTO', draggable: 'false' });
    }
    const node = h('div', { class: ['el', 'el-' + e.type, e.type === 'image' && 'frame-' + (e.frame || 'none'), e.type === 'image' && e.fit === 'contain' && 'fit-contain', selected?.elId === e.id && 'selected'], style, dataset: { id: e.id } }, inner);
    if (editing) {
      node.append(h('span', { class: 'handle handle-resize', dataset: { act: 'resize' }, title: '크기 조절' }), h('span', { class: 'handle handle-rotate', dataset: { act: 'rotate' }, title: '회전' }));
      node.addEventListener('pointerdown', (ev) => startDrag(ev, paper, e, node));
    }
    return node;
  }

  function paperNode(paper, index) {
    const surface = h('div', { class: 'paper-surface', style: { backgroundImage: paper.background ? `url("${paper.background}")` : null } }, paper.elements.map((e) => elNode(paper, e)));
    if (editing) {
      surface.addEventListener('pointerdown', (ev) => {
        if (ev.target === surface) {
          selected = { paperId: paper.id, elId: null };
          paintAll();
        }
      });
    }
    const node = h('article', { class: ['paper', editing && 'editing', selected?.paperId === paper.id && !selected.elId && 'paper-selected'], style: { aspectRatio: String(paper.aspect || 0.75), '--tilt': editing ? '0deg' : (index % 2 ? 0.7 : -0.6) + 'deg' }, dataset: { id: paper.id } }, surface);
    if (editing)
      node.append(h('div', { class: 'paper-bar' },
        h('span', null, paper.title || `종이 ${index + 1}`),
        h('button', { class: 'btn-icon', title: '앞으로', onclick: () => movePaper(paper, -1) }, '←'),
        h('button', { class: 'btn-icon', title: '뒤로', onclick: () => movePaper(paper, 1) }, '→'),
        h('button', { class: 'btn-icon', title: '종이 설정', onclick: () => { selected = { paperId: paper.id, elId: null }; paintAll(); } }, '⚙'),
        h('button', { class: 'btn-icon danger', title: '종이 삭제', onclick: () => deletePaper(paper) }, '✕')));
    return editing ? node : reveal(node);
  }

  function paintBoard() {
    fill(board, ...papers.map(paperNode));
    if (!papers.length) board.append(h('p', { class: 'folder-empty' }, editing ? '[+ 종이 추가]를 눌러 시작하세요.' : '아직 기록이 없어요.'));
  }

  function paintToolbar() {
    if (headExtra) headExtra.textContent = editing ? '편집 끝내기' : '✎ 편집 모드';
    toolbar.classList.toggle('show', editing);
    if (!editing) return fill(toolbar);
    fill(toolbar, 
      h('span', { class: 'label' }, dirty.size ? '● 저장하지 않은 변경사항' : '편집 모드 · 요소를 끌어서 옮기세요'),
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn btn-sm', onclick: addPaper }, '+ 종이 추가'),
      h('button', { class: 'btn btn-sm btn-primary', disabled: !dirty.size, onclick: (ev) => busy(ev.currentTarget, saveAll) }, '저장'));
  }

  /* ───── 오른쪽 설정 패널 ───── */
  function paintInspector() {
    inspector.classList.toggle('show', editing && !!selected);
    if (!editing || !selected) return fill(inspector);
    const paper = findPaper(selected.paperId);
    if (!paper) return fill(inspector);
    const e = findEl();
    const redraw = () => { markDirty(paper.id); paintBoard(); };
    const set = (k, rerenderPanel = false) => (v) => { e[k] = v; redraw(); if (rerenderPanel) paintInspector(); };
    const range = (label, value, min, max, step, onInput) => h('label', { class: 'field' }, h('span', { class: 'field-label' }, `${label}`), h('input', { type: 'range', min, max, step, value, oninput: (ev) => onInput(Number(ev.target.value)) }));
    const close = h('button', { class: 'btn-icon', title: '닫기', onclick: () => { selected = null; paintAll(); } }, '✕');

    if (!e) {
      fill(inspector, 
        h('div', { class: 'insp-head' }, h('b', null, '종이 설정'), close),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, '종이 이름 (편집용)'), h('input', { class: 'input', value: paper.title || '', oninput: (ev) => { paper.title = ev.target.value; markDirty(paper.id); } })),
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, '종이 배경'),
          h('div', { class: 'paper-swatches' }, store.settings.paperLibrary.map((u) => h('button', { class: ['paper-swatch', paper.background === u && 'on'], style: { backgroundImage: `url("${u}")` }, title: u.split('/').pop(), onclick: () => { paper.background = u; redraw(); paintInspector(); } })))),
        imageField('직접 올린 종이 이미지', paper.background, (v) => { paper.background = v; redraw(); }, { folder: 'papers', small: true }),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, '종이 비율'), selectInput(ASPECTS, String(paper.aspect), (v) => { paper.aspect = Number(v); redraw(); })),
        h('div', { class: 'insp-actions' },
          h('button', { class: 'btn btn-sm', onclick: () => addElement(paper, 'text') }, '+ 글상자'),
          h('button', { class: 'btn btn-sm', onclick: () => addElement(paper, 'image') }, '+ 사진'),
          h('button', { class: 'btn btn-sm', onclick: () => addElement(paper, 'deco') }, '+ 장식')));
      return;
    }

    const common = [
      range('회전', e.r || 0, -45, 45, 1, set('r')),
      range('투명도', e.opacity ?? 1, 0.1, 1, 0.05, set('opacity')),
      h('div', { class: 'insp-actions' },
        h('button', { class: 'btn btn-sm', onclick: () => layer(paper, e, 1) }, '맨 앞으로'),
        h('button', { class: 'btn btn-sm', onclick: () => layer(paper, e, -1) }, '맨 뒤로'),
        h('button', { class: 'btn btn-sm', onclick: () => duplicate(paper, e) }, '복제'),
        h('button', { class: 'btn btn-sm btn-danger', onclick: () => removeEl(paper, e) }, '삭제')),
    ];
    if (e.type === 'text') {
      fill(inspector, 
        h('div', { class: 'insp-head' }, h('b', null, '글상자'), close),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, '내용 (**굵게** *기울임*)'), textArea(e.text, set('text'), { rows: 4 })),
        h('div', { class: 'row' }, selectInput(FONT_NAMES, e.font || 'body', set('font')), selectInput([['left', '왼쪽 정렬'], ['center', '가운데'], ['right', '오른쪽']], e.align || 'left', set('align'))),
        range('글자 크기', e.size || 3, 1, 16, 0.1, set('size')),
        colorField('글자 색', e.color || '#2b261f', set('color')),
        h('label', { class: 'toggle' }, h('input', { type: 'checkbox', checked: !!e.bold, onchange: (ev) => set('bold')(ev.target.checked) }), h('span', { class: 'toggle-track' }), h('span', null, '굵게')),
        ...common);
    } else {
      fill(inspector, 
        h('div', { class: 'insp-head' }, h('b', null, '이미지'), close),
        imageField('', e.src, set('src'), { folder: 'papers', small: true }),
        h('div', { class: 'row' },
          selectInput([['none', '액자 없음'], ['photo', '사진 액자'], ['polaroid', '폴라로이드'], ['tape', '테이프 붙인 사진']], e.frame || 'none', set('frame')),
          selectInput([['cover', '꽉 채우기'], ['contain', '전체 보이기']], e.fit || 'cover', set('fit'))),
        ...common);
    }
  }

  function paintAll() {
    paintToolbar();
    paintBoard();
    paintInspector();
  }

  /* ───── 끌기 / 크기 / 회전 ───── */
  function startDrag(ev, paper, e, node) {
    if (ev.button !== undefined && ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    const act = ev.target.dataset?.act || 'move';
    const already = selected?.elId === e.id;
    selected = { paperId: paper.id, elId: e.id };
    if (!already) {
      node.closest('.paper-surface').querySelectorAll('.el.selected').forEach((n) => n.classList.remove('selected'));
      node.classList.add('selected');
      paintInspector();
    }
    const surface = node.closest('.paper-surface').getBoundingClientRect();
    const start = { x: ev.clientX, y: ev.clientY, ex: e.x, ey: e.y, ew: e.w, eh: e.h, r: e.r || 0 };
    const box = node.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    let moved = false;
    const onMove = (m) => {
      const dx = ((m.clientX - start.x) / surface.width) * 100;
      const dy = ((m.clientY - start.y) / surface.height) * 100;
      if (Math.abs(dx) + Math.abs(dy) > 0.2) moved = true;
      if (act === 'move') {
        e.x = +Math.min(98, Math.max(-20, start.ex + dx)).toFixed(2);
        e.y = +Math.min(98, Math.max(-10, start.ey + dy)).toFixed(2);
        node.style.left = e.x + '%';
        node.style.top = e.y + '%';
      } else if (act === 'resize') {
        e.w = +Math.max(3, start.ew + dx).toFixed(2);
        e.h = +Math.max(2, start.eh + dy).toFixed(2);
        node.style.width = e.w + '%';
        if (e.type === 'image') node.style.height = e.h + '%';
        else node.style.minHeight = e.h + '%';
      } else if (act === 'rotate') {
        const a = (Math.atan2(m.clientY - cy, m.clientX - cx) * 180) / Math.PI + 90;
        e.r = Math.round(((a + 540) % 360) - 180);
        node.style.transform = `rotate(${e.r}deg)`;
      }
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      if (moved) {
        markDirty(paper.id);
        paintInspector();
      }
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  /* ───── 요소 추가/삭제 ───── */
  async function addElement(paper, kind) {
    const topZ = Math.max(1, ...paper.elements.map((x) => x.z || 1)) + 1;
    let e;
    if (kind === 'text') e = { id: uid(), type: 'text', x: 20, y: 40, w: 50, h: 8, r: 0, z: topZ, text: '새 글상자', font: 'body', size: 3.4, color: store.settings.theme.text, align: 'left' };
    else {
      const src = await pickMedia();
      if (src === null && kind === 'deco') return;
      e = { id: uid(), type: 'image', x: 30, y: 30, w: kind === 'deco' ? 18 : 36, h: kind === 'deco' ? 14 : 28, r: 0, z: topZ, src: src || '', frame: kind === 'deco' ? 'none' : 'photo', fit: kind === 'deco' ? 'contain' : 'cover' };
    }
    paper.elements.push(e);
    selected = { paperId: paper.id, elId: e.id };
    markDirty(paper.id);
    paintAll();
  }
  function removeEl(paper, e) {
    paper.elements = paper.elements.filter((x) => x.id !== e.id);
    selected = { paperId: paper.id, elId: null };
    markDirty(paper.id);
    paintAll();
  }
  function duplicate(paper, e) {
    const copy = { ...clone(e), id: uid(), x: e.x + 3, y: e.y + 3, z: (e.z || 1) + 1 };
    paper.elements.push(copy);
    selected = { paperId: paper.id, elId: copy.id };
    markDirty(paper.id);
    paintAll();
  }
  function layer(paper, e, dir) {
    const zs = paper.elements.map((x) => x.z || 1);
    e.z = dir > 0 ? Math.max(...zs) + 1 : Math.min(...zs) - 1;
    markDirty(paper.id);
    paintBoard();
  }

  /* ───── 종이 추가/삭제/순서 (바로 저장) ───── */
  async function addPaper() {
    try {
      const row = await store.api.insert('papers', { page_id: page.id, sort_order: papers.length, title: `종이 ${papers.length + 1}`, background: store.settings.paperLibrary[papers.length % 2] || '', aspect: 0.75, elements: [] });
      papers.push(row);
      selected = { paperId: row.id, elId: null };
      paintAll();
      toast('종이를 추가했어요');
    } catch (err) { toastError(err); }
  }
  async function deletePaper(paper) {
    if (!(await confirmDialog('이 종이와 위에 있는 모든 요소를 삭제할까요?', { ok: '삭제', danger: true }))) return;
    try {
      await store.api.remove('papers', paper.id);
      papers = papers.filter((p) => p.id !== paper.id);
      dirty.delete(paper.id);
      selected = null;
      paintAll();
    } catch (err) { toastError(err); }
  }
  async function movePaper(paper, delta) {
    const i = papers.indexOf(paper);
    const j = i + delta;
    if (j < 0 || j >= papers.length) return;
    [papers[i], papers[j]] = [papers[j], papers[i]];
    paintBoard();
    try { await store.api.reorder('papers', papers.map((p) => p.id)); } catch (err) { toastError(err); }
  }

  async function saveAll({ quiet = false } = {}) {
    try {
      for (const id of [...dirty]) {
        const p = findPaper(id);
        if (p) await store.api.update('papers', id, { elements: p.elements, background: p.background, aspect: p.aspect, title: p.title });
        dirty.delete(id);
      }
      paintToolbar();
      if (!quiet) toast('저장했어요', 'success');
    } catch (err) { toastError(err); }
  }

  // 키보드: Delete 로 삭제, 방향키로 미세 이동
  const onKey = (ev) => {
    if (!editing || !selected?.elId || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
    const paper = findPaper(selected.paperId);
    const e = findEl();
    if (!e) return;
    const step = ev.shiftKey ? 2 : 0.5;
    const moves = { ArrowLeft: ['x', -step], ArrowRight: ['x', step], ArrowUp: ['y', -step], ArrowDown: ['y', step] };
    if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); removeEl(paper, e); }
    else if (moves[ev.key]) { ev.preventDefault(); const [k, d] = moves[ev.key]; e[k] = +(e[k] + d).toFixed(2); markDirty(paper.id); paintBoard(); }
  };
  const onBeforeUnload = (ev) => { if (dirty.size) { ev.preventDefault(); ev.returnValue = ''; } };
  document.addEventListener('keydown', onKey);
  window.addEventListener('beforeunload', onBeforeUnload);

  paintAll();

  return () => {
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('beforeunload', onBeforeUnload);
    if (dirty.size) {
      saveAll({ quiet: true }).then(() => toast('다른 페이지로 이동해서 변경사항을 자동 저장했어요'));
    }
  };
}

// ─────────────────────────────────────────────────────────────
// blocks.js — 글 본문을 "블록" 단위로 저장하고 보여주는 부분
// 본문 = [소제목] [글] [사진] [글] [사진 2장] ... 처럼 자유롭게 섞어 쓰기
// ─────────────────────────────────────────────────────────────
import { h, img, richText, uid, reveal, fill } from '../core/dom.js';
import { makeSortable } from './sortable.js';
import { textArea, textInput, selectInput, imageField, uploadFiles, pickFiles } from './fields.js';
import { toastError } from './ui.js';

/* ───────── 방문자에게 보여주기 ───────── */
export function renderBlocks(blocks = []) {
  return h(
    'div',
    { class: 'blocks' },
    blocks.map((b) => {
      switch (b.type) {
        case 'heading':
          return h('h2', { class: 'b-heading' }, b.text);
        case 'text':
          return h('div', { class: 'b-text' }, richText(b.text));
        case 'quote':
          return h('blockquote', { class: 'b-quote' }, richText(b.text), b.cite && h('cite', null, '— ' + b.cite));
        case 'divider':
          return h('div', { class: 'b-divider', 'aria-hidden': 'true' }, h('span', null, '✶'));
        case 'image':
          return b.url
            ? reveal(h('figure', { class: ['b-image', 'size-' + (b.size || 'full'), 'frame-' + (b.frame || 'photo')] }, h('div', { class: 'b-image-inner' }, img(b.url, { alt: b.caption || '' })), b.caption && h('figcaption', null, b.caption)))
            : null;
        case 'pair':
          return reveal(h('div', { class: 'b-pair' }, (b.urls || []).filter(Boolean).map((u, i) => h('figure', { class: 'b-image frame-' + (b.frame || 'photo') }, h('div', { class: 'b-image-inner' }, img(u)), b.captions?.[i] && h('figcaption', null, b.captions[i])))));
        default:
          return null;
      }
    })
  );
}

/* ───────── 관리자: 블록 편집기 ───────── */
const LABELS = { heading: '소제목', text: '글', image: '사진', pair: '사진 2장', quote: '인용', divider: '구분선' };

export function blockEditor(initial, onChange, { folder = 'posts' } = {}) {
  const blocks = (initial || []).map((b) => ({ id: b.id || uid(), ...b }));
  const list = h('div', { class: 'block-list' });
  const changed = () => onChange(blocks.map((b) => ({ ...b })));

  const sorter = makeSortable(list, {
    item: '.block-card',
    onEnd: (ids) => {
      blocks.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
      changed();
    },
  });

  function insertAt(index, newBlocks) {
    blocks.splice(index, 0, ...newBlocks);
    paint();
    changed();
  }

  async function addImages(index) {
    const files = await pickFiles({ multiple: true });
    if (!files.length) return;
    try {
      const rows = await uploadFiles(files, { folder });
      insertAt(index, rows.map((r) => ({ id: uid(), type: 'image', url: r.url, caption: '', size: 'full', frame: 'photo' })));
    } catch (e) {
      toastError(e);
    }
  }

  function adder(getIndex) {
    const add = (type) => () => {
      const index = getIndex();
      if (type === 'image') return addImages(index);
      const base = { id: uid(), type };
      if (type === 'text' || type === 'heading' || type === 'quote') base.text = '';
      if (type === 'pair') Object.assign(base, { urls: ['', ''], captions: ['', ''], frame: 'photo' });
      insertAt(index, [base]);
      requestAnimationFrame(() => list.querySelector(`[data-id="${base.id}"] textarea, [data-id="${base.id}"] input`)?.focus());
    };
    return h('div', { class: 'block-adder' }, h('span', { class: 'adder-plus' }, '+'), ...['text', 'heading', 'image', 'pair', 'quote', 'divider'].map((t) => h('button', { type: 'button', class: 'chip', onclick: add(t) }, LABELS[t])));
  }

  function card(b) {
    const set = (k) => (v) => { b[k] = v; changed(); };
    let body;
    if (b.type === 'text') body = textArea(b.text, set('text'), { rows: 4, placeholder: '본문을 입력하세요. **굵게** *기울임* [링크](https://...) 사용 가능' });
    else if (b.type === 'heading') body = textInput(b.text, set('text'), { placeholder: '소제목' });
    else if (b.type === 'quote') body = h('div', { class: 'stack' }, textArea(b.text, set('text'), { rows: 2, placeholder: '인용할 문장' }), textInput(b.cite, set('cite'), { placeholder: '출처 (선택)' }));
    else if (b.type === 'divider') body = h('div', { class: 'muted' }, '— ✶ — 구분선');
    else if (b.type === 'image')
      body = h('div', { class: 'stack' },
        imageField('', b.url, set('url'), { folder }),
        h('div', { class: 'row wrap' },
          textInput(b.caption, set('caption'), { placeholder: '사진 설명 (선택)' }),
          selectInput([['full', '크기: 꽉 차게'], ['wide', '크기: 넓게'], ['half', '크기: 중간'], ['small', '크기: 작게']], b.size || 'full', set('size')),
          selectInput([['photo', '액자: 사진'], ['polaroid', '액자: 폴라로이드'], ['plain', '액자: 없음']], b.frame || 'photo', set('frame'))));
    else if (b.type === 'pair')
      body = h('div', { class: 'pair-edit' }, [0, 1].map((k) => h('div', { class: 'stack' },
        imageField('', b.urls?.[k], (v) => { b.urls[k] = v; changed(); }, { folder, small: true }),
        textInput(b.captions?.[k], (v) => { b.captions[k] = v; changed(); }, { placeholder: '설명 (선택)' }))));

    const el = h('div', { class: 'block-card sort-item', dataset: { id: b.id } },
      h('div', { class: 'block-card-head' },
        h('span', { class: 'drag-handle', title: '끌어서 순서 바꾸기' }, '⋮⋮'),
        h('span', { class: 'block-type' }, LABELS[b.type] || b.type),
        h('span', { class: 'spacer' }),
        h('button', { type: 'button', class: 'btn-icon', title: '위로', onclick: () => sorter.move(el, -1) }, '↑'),
        h('button', { type: 'button', class: 'btn-icon', title: '아래로', onclick: () => sorter.move(el, 1) }, '↓'),
        h('button', { type: 'button', class: 'btn-icon danger', title: '블록 삭제', onclick: () => { blocks.splice(blocks.indexOf(b), 1); paint(); changed(); } }, '✕')),
      body,
      h('div', { class: 'block-card-foot' }, adder(() => blocks.indexOf(b) + 1)));
    return el;
  }

  function paint() {
    fill(list, ...blocks.map((b) => card(b)));
  }
  paint();

  const wrap = h('div', { class: 'block-editor' }, adder(() => 0), list);
  // 편집기 위로 이미지 파일을 끌어다 놓으면 맨 뒤에 사진 블록 추가
  wrap.addEventListener('dragover', (e) => e.dataTransfer?.types?.includes('Files') && e.preventDefault());
  wrap.addEventListener('drop', async (e) => {
    const files = [...(e.dataTransfer?.files || [])].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();
    try {
      const rows = await uploadFiles(files, { folder });
      insertAt(blocks.length, rows.map((r) => ({ id: uid(), type: 'image', url: r.url, caption: '', size: 'full', frame: 'photo' })));
    } catch (err) {
      toastError(err);
    }
  });
  return wrap;
}

// ─────────────────────────────────────────────────────────────
// custom.js — 관리자 페이지에서 새로 만든 "자유 글 페이지"
// ─────────────────────────────────────────────────────────────
import { h, img, append } from '../core/dom.js';
import { link } from '../core/router.js';
import { pageHeader, editFab } from '../components/layout.js';
import { renderBlocks } from '../components/blocks.js';

export async function render(root, page) {
  const blocks = page.content?.blocks || [];
  append(root, h('section', { class: 'wrap custom-page' },
    pageHeader(page),
    page.cover && h('figure', { class: 'b-image size-full frame-photo custom-cover' }, h('div', { class: 'b-image-inner' }, img(page.cover))),
    h('div', { class: 'paper-sheet' }, blocks.length ? renderBlocks(blocks) : h('p', { class: 'muted' }, '아직 내용이 없어요.')),
    editFab(link(`/admin/page/${page.id}`))));
}

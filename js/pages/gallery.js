// ─────────────────────────────────────────────────────────────
// gallery.js — 갤러리 페이지
// 카테고리(로그/커미션 등)를 누르면 해당 그림들이 한 장씩 세로로 쭉 이어집니다.
// 카테고리 이름·순서·추가·삭제는 모두 관리자 페이지에서 합니다.
// ─────────────────────────────────────────────────────────────
import { h, img, reveal, safeUrl, append, fill } from '../core/dom.js';
import { store } from '../core/store.js';
import { link, pagePath } from '../core/router.js';
import { pageHeader, editFab } from '../components/layout.js';

export async function render(root, page, route) {
  const cats = await store.api.select('gallery_categories', { eq: { page_id: page.id } });
  const current = cats.find((c) => c.id === route.query.c) || cats[0];
  const images = current ? await store.api.select('gallery_images', { eq: { category_id: current.id } }) : [];

  const tabs = h('nav', { class: 'index-tabs', 'aria-label': '갤러리 분류' },
    cats.map((c) => h('a', { class: ['index-tab', c.id === current?.id && 'active'], href: link(`${pagePath(page)}?c=${c.id}`) }, c.name)));

  const feed = h('div', { class: 'feed' },
    images.map((im, i) =>
      reveal(h('figure', { class: 'feed-item' },
        h('div', { class: 'feed-meta' }, h('span', null, `No. ${String(i + 1).padStart(3, '0')}`), h('span', null, current.name)),
        h('button', { class: 'feed-img', onclick: () => lightbox(images, i), 'aria-label': '크게 보기' }, img(im.url, { alt: im.caption || '' })),
        im.caption && h('figcaption', { class: 'feed-caption' }, im.caption)))));

  append(root, h('section', { class: 'wrap gallery-page' },
    pageHeader(page, { kicker: `GALLERY · ${images.length} PRINTS` }),
    cats.length ? tabs : null,
    images.length ? feed : h('p', { class: 'empty-note' }, cats.length ? '이 분류에는 아직 이미지가 없어요.' : '아직 분류가 없어요.'),
    editFab(link(`/admin/page/${page.id}`), '갤러리 관리')));
}

function lightbox(images, start) {
  let i = start;
  const pic = h('div', { class: 'lb-pic' });
  const cap = h('p', { class: 'lb-cap' });
  const paint = () => {
    const im = images[i];
    fill(pic, h('img', { src: safeUrl(im.url), alt: im.caption || '' }));
    cap.textContent = `${i + 1} / ${images.length}${im.caption ? ' · ' + im.caption : ''}`;
  };
  const go = (d) => { i = (i + d + images.length) % images.length; paint(); };
  const close = () => { box.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
  const box = h('div', { class: 'lightbox', role: 'dialog', 'aria-modal': 'true', onclick: (e) => e.target === box && close() },
    h('button', { class: 'lb-btn lb-close', onclick: close, 'aria-label': '닫기' }, '✕'),
    images.length > 1 && h('button', { class: 'lb-btn lb-prev', onclick: () => go(-1), 'aria-label': '이전' }, '‹'),
    pic,
    images.length > 1 && h('button', { class: 'lb-btn lb-next', onclick: () => go(1), 'aria-label': '다음' }, '›'),
    cap);
  document.addEventListener('keydown', onKey);
  document.body.append(box);
  paint();
}

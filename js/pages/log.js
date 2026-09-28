// ─────────────────────────────────────────────────────────────
// log.js — 로그(블로그) 페이지: 글 목록 + 글 본문
// ─────────────────────────────────────────────────────────────
import { h, img, fmtDate, reveal, append } from '../core/dom.js';
import { store } from '../core/store.js';
import { link, pagePath } from '../core/router.js';
import { pageHeader, editFab } from '../components/layout.js';
import { renderBlocks } from '../components/blocks.js';

export async function render(root, page, route) {
  const postId = route.parts[2];
  if (postId) return renderPost(root, page, postId);

  const posts = await store.api.select('posts', { eq: { page_id: page.id }, order: [['date', false], ['created_at', false]] });
  append(root, h('section', { class: 'wrap log-page' },
    pageHeader(page, { kicker: `LOG BOOK · ${posts.length} ENTRIES` }),
    posts.length
      ? h('ol', { class: 'log-list' }, posts.map((p, i) => {
          const firstImg = p.cover || p.blocks?.find((b) => b.type === 'image' && b.url)?.url;
          return reveal(h('li', { class: 'log-item' },
            h('a', { class: 'log-card', href: link(`${pagePath(page)}/${p.id}`) },
              h('div', { class: 'log-thumb' }, img(firstImg, { alt: '', emptyLabel: 'NO PHOTO' })),
              h('div', { class: 'log-text' },
                h('span', { class: 'log-no label' }, `ENTRY ${String(posts.length - i).padStart(3, '0')} · ${fmtDate(p.date)}`),
                h('h2', { class: 'log-title' }, p.title || '(제목 없음)'),
                p.excerpt && h('p', { class: 'log-excerpt' }, p.excerpt),
                h('span', { class: 'log-more label' }, '읽기 →')))));
        }))
      : h('p', { class: 'empty-note' }, '아직 기록된 글이 없어요.'),
    editFab(link(`/admin/page/${page.id}`), '로그 관리')));
}

async function renderPost(root, page, id) {
  const p = await store.api.get('posts', id);
  if (!p) {
    append(root, h('div', { class: 'notice' }, h('h1', { class: 'page-title' }, '찾을 수 없는 글'), h('a', { class: 'btn', href: link(pagePath(page)) }, '목록으로')));
    return;
  }
  document.title = `${p.title} · ${store.settings.site.title}`;
  append(root, h('article', { class: 'wrap post' },
    h('a', { class: 'back-link', href: link(pagePath(page)) }, '← ', page.title),
    h('div', { class: 'paper-sheet post-sheet' },
      h('header', { class: 'post-head' },
        h('span', { class: 'page-kicker' }, fmtDate(p.date)),
        h('h1', { class: 'post-title' }, p.title || '(제목 없음)'),
        h('span', { class: 'post-rule' })),
      p.cover && h('figure', { class: 'b-image size-full frame-photo post-cover' }, h('div', { class: 'b-image-inner' }, img(p.cover))),
      renderBlocks(p.blocks || [])),
    editFab(link(`/admin/post/${p.id}`), '이 글 편집')));
}

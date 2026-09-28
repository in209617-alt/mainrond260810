// ─────────────────────────────────────────────────────────────
// series.js — "DVD 선반" 페이지 (기본 이름: 시리즈)
// 각 시리즈를 DVD 케이스로 보여줍니다. 마우스를 올리면 케이스가 펼쳐지고
// 디스크가 빠져나오며, 누르면 상세 페이지로 이동합니다.
// ─────────────────────────────────────────────────────────────
import { h, img, safeUrl, reveal, richText, append, fill } from '../core/dom.js';
import { store } from '../core/store.js';
import { link, pagePath } from '../core/router.js';
import { pageHeader, editFab } from '../components/layout.js';
import { renderBlocks } from '../components/blocks.js';

const canHover = () => matchMedia('(hover: hover)').matches;

function cover(s, cls = 'dvd-cover') {
  const url = safeUrl(s.cover);
  return h('div', { class: cls, style: { '--spine': s.spine_color || '#2a2622', '--label': s.label_color || '#e4dab9' } },
    url ? img(url, { alt: s.title }) : h('div', { class: 'cover-type' }, h('span', { class: 'cover-sub' }, s.subtitle || 'SERIES'), h('span', { class: 'cover-title' }, s.title), h('span', { class: 'cover-year' }, s.year || '')),
    h('span', { class: 'cover-shine' }));
}

export async function render(root, page, route) {
  const detailId = route.parts[2];
  if (detailId) return renderDetail(root, page, detailId);

  const list = await store.api.select('series', { eq: { page_id: page.id } });
  const info = h('div', { class: 'shelf-info', 'aria-live': 'polite' });
  const showInfo = (s, i) => {
    if (!s) return fill(info, h('span', { class: 'label muted' }, canHover() ? '케이스 위에 마우스를 올려보세요' : '케이스를 눌러 펼쳐보세요'));
    fill(info, 
      h('span', { class: 'label shelf-no' }, `TAPE No.${String(i + 1).padStart(2, '0')} · ${s.subtitle || ''}`),
      h('h2', { class: 'shelf-title' }, s.title),
      h('span', { class: 'label shelf-year' }, s.year || ''),
      s.summary && h('p', { class: 'shelf-summary' }, s.summary));
  };
  showInfo(null);

  let active = null;
  const shelf = h('div', { class: 'shelf', role: 'list' },
    list.map((s, i) => {
      const href = link(`${pagePath(page)}/${s.id}`);
      const el = h('a', { class: 'dvd', role: 'listitem', href, style: { '--spine': s.spine_color || '#2a2622', '--label': s.label_color || '#e4dab9', '--h': 350 - ((i * 7) % 3) * 10 }, 'aria-label': s.title },
        h('div', { class: 'dvd-spine' },
          h('span', { class: 'spine-no' }, String(i + 1).padStart(2, '0')),
          h('span', { class: 'spine-title' }, s.title),
          h('span', { class: 'spine-sub' }, s.subtitle || ''),
          h('span', { class: 'spine-logo' }, 'DVD')),
        h('div', { class: 'dvd-open' },
          cover(s),
          h('div', { class: 'dvd-disc' }, h('span', { class: 'disc-label', style: s.cover ? { backgroundImage: `url("${safeUrl(s.cover)}")` } : null }), h('span', { class: 'disc-hole' }))));
      el.addEventListener('mouseenter', () => showInfo(s, i));
      el.addEventListener('focus', () => showInfo(s, i));
      // 터치 화면: 첫 번째 탭 = 펼치기, 두 번째 탭 = 이동
      el.addEventListener('click', (ev) => {
        if (canHover()) return;
        if (active !== el) {
          ev.preventDefault();
          active?.classList.remove('open');
          active = el;
          el.classList.add('open');
          showInfo(s, i);
          el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      });
      return el;
    }));
  shelf.addEventListener('mouseleave', () => showInfo(null));

  append(root, h('section', { class: 'wrap series-page' },
    pageHeader(page, { kicker: `SERIES ARCHIVE · ${String(list.length).padStart(2, '0')} TAPES` }),
    list.length ? h('div', { class: 'shelf-wrap' }, shelf, h('div', { class: 'shelf-board' })) : h('p', { class: 'empty-note' }, '아직 등록된 시리즈가 없어요.'),
    info,
    editFab(link(`/admin/page/${page.id}`), '시리즈 관리')));
}

async function renderDetail(root, page, id) {
  const s = await store.api.get('series', id);
  if (!s) {
    append(root, h('div', { class: 'notice' }, h('h1', { class: 'page-title' }, '찾을 수 없는 시리즈'), h('a', { class: 'btn', href: link(pagePath(page)) }, '목록으로')));
    return;
  }
  document.title = `${s.title} · ${store.settings.site.title}`;
  append(root, h('article', { class: 'wrap series-detail' },
    h('a', { class: 'back-link', href: link(pagePath(page)) }, '← ', page.title),
    h('header', { class: 'sd-head' },
      reveal(h('div', { class: 'sd-case' }, cover(s, 'dvd-cover big'), h('div', { class: 'dvd-disc sd-disc' }, h('span', { class: 'disc-label', style: s.cover ? { backgroundImage: `url("${safeUrl(s.cover)}")` } : null }), h('span', { class: 'disc-hole' })))),
      h('div', { class: 'sd-meta' },
        h('span', { class: 'page-kicker' }, [s.subtitle, s.year].filter(Boolean).join(' · ')),
        h('h1', { class: 'page-title' }, s.title),
        s.summary && h('p', { class: 'sd-summary' }, richText(s.summary)))),
    h('div', { class: 'paper-sheet' }, renderBlocks(s.blocks || [])),
    editFab(link(`/admin/series/${s.id}`), '이 시리즈 편집')));
}

// ─────────────────────────────────────────────────────────────
// home.js — 메인 페이지
// 구역(대표 이미지 / D-Day / 음악 / 두 캐릭터 / 캐릭터 공간 / 편집자의 말)을
// 관리자 페이지에서 켜고 끄거나 순서를 바꾼 그대로 그립니다.
// ─────────────────────────────────────────────────────────────
import { h, img, fmtDate, parseLocalDate, todayISO, richText, reveal, append } from '../core/dom.js';
import { store } from '../core/store.js';
import { link } from '../core/router.js';
import { musicPlayer } from '../components/music.js';
import { editFab } from '../components/layout.js';

/** D-Day 계산: 시작일 당일 = D+0, 다음날 = D+1 … (내 컴퓨터/폰의 날짜 기준 자동 계산) */
export function ddayNumber(startISO, now = new Date()) {
  const start = parseLocalDate(startISO);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today - start) / 86400000);
}
export const ddayText = (n) => (n >= 0 ? `D+${n}` : `D-${Math.abs(n)}`);

function heroSection(cfg) {
  return h('figure', { class: 'home-card hero' },
    h('div', { class: 'card-kicker' }, h('span', null, cfg.label || 'FRONT PAGE'), h('span', null, 'No. 001')),
    h('div', { class: 'hero-photo' }, img(cfg.image, { alt: cfg.caption || '대표 이미지', emptyLabel: '대표 이미지' })),
    cfg.caption && h('figcaption', { class: 'hero-caption' }, cfg.caption));
}

function ddaySection(cfg) {
  const num = h('div', { class: 'dday-num' });
  const today = h('span');
  const paint = () => {
    num.textContent = ddayText(ddayNumber(cfg.start));
    today.textContent = 'TODAY ' + fmtDate(todayISO());
  };
  paint();
  // 자정이 지나면 자동으로 숫자가 바뀌도록 1분마다 확인
  const timer = setInterval(paint, 60 * 1000);
  const el = h('div', { class: 'home-card dday ticket' },
    h('div', { class: 'card-kicker' }, h('span', null, cfg.label || 'D-DAY'), today),
    num,
    h('div', { class: 'dday-since' }, h('span', { class: 'dday-date' }, fmtDate(cfg.start)), cfg.note && h('span', null, cfg.note)));
  el._cleanup = () => clearInterval(timer);
  return el;
}

function musicSection(cfg) {
  const el = h('div', { class: 'home-card music-card dark-card' }, h('div', { class: 'card-kicker' }, h('span', null, 'NOW PLAYING'), h('span', null, 'SIDE A')), musicPlayer(cfg));
  el._cleanup = () => el.querySelector('.music')?._stop?.();
  return el;
}

function duoSection(cfg) {
  const items = cfg.items || [];
  const card = (c, i) =>
    h('article', { class: ['duo-card', i === 1 && 'right'] },
      h('div', { class: 'duo-tag' }, c.tag || `CHARACTER · 0${i + 1}`),
      h('div', { class: 'duo-photo' }, img(c.photo, { alt: c.name || '', emptyLabel: 'PHOTO' })),
      h('h3', { class: 'duo-name' }, c.name),
      c.bio && h('p', { class: 'duo-bio' }, richText(c.bio)),
      c.sd && h('div', { class: 'duo-sd' }, img(c.sd, { alt: '' })));
  return h('section', { class: 'home-card duo' },
    h('div', { class: 'card-kicker' }, h('span', null, cfg.title || '두 사람'), h('span', null, 'RELATION FILE')),
    h('div', { class: 'duo-row' },
      items[0] && card(items[0], 0),
      h('div', { class: 'duo-link', 'aria-hidden': 'true' }, h('span', { class: 'duo-thread' }), h('img', { class: 'duo-heart', src: 'assets/deco/heart.svg', alt: '' }), h('span', { class: 'duo-thread' })),
      items[1] && card(items[1], 1)));
}

function stageSection(cfg) {
  const host = h('div', { class: ['stage-host', cfg.filter && 'vintage'] });
  const el = h('section', { class: 'home-card stage-card dark-card' },
    h('div', { class: 'card-kicker' }, h('span', { class: 'rec' }, '● REC'), h('span', null, cfg.title || '')),
    h('div', { class: 'stage-frame' }, host),
    cfg.caption && h('p', { class: 'stage-caption' }, cfg.caption));
  let stop = null;
  let dead = false;
  import('../components/stage.js')
    .then((m) => m.createStage(host, cfg))
    .then((fn) => (dead ? fn() : (stop = fn)))
    .catch((e) => console.warn('캐릭터 공간을 그리지 못했어요', e));
  el._cleanup = () => {
    dead = true;
    stop?.();
  };
  return el;
}

function noteSection(cfg) {
  return h('section', { class: 'home-card note paper-card' }, h('div', { class: 'card-kicker' }, h('span', null, cfg.title || '')), h('div', { class: 'note-text' }, richText(cfg.text)));
}

const SECTIONS = { hero: heroSection, dday: ddaySection, music: musicSection, duo: duoSection, stage: stageSection, note: noteSection };

export async function render(root) {
  const home = store.settings.home;
  const cleanups = [];
  const grid = h('div', { class: 'home-grid' });
  home.sections.filter((s) => s.on && SECTIONS[s.key]).forEach((s) => {
    const el = SECTIONS[s.key](home[s.key] || {});
    el.classList.add('size-' + (s.size || 'full'), 'sec-' + s.key);
    if (el._cleanup) cleanups.push(el._cleanup);
    grid.append(s.key === 'stage' ? el : reveal(el));
  });
  append(root, 
    h('section', { class: 'home wrap' },
      h('div', { class: 'home-deck' }, h('span', { class: 'rule' }), h('p', null, store.settings.site.subtitle), h('span', { class: 'rule' })),
      grid,
      editFab(link('/admin/home'), '메인 화면 편집')));
  return () => cleanups.forEach((fn) => fn());
}

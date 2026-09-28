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

/**
 * D-Day 계산 (내 컴퓨터/폰의 날짜 기준 자동 계산)
 *  firstDay = 1 (기본): 시작일 당일 = D+1  → 8월 10일 시작이면 9월 28일 = D+50  (기념일 세는 방식)
 *  firstDay = 0        : 시작일 당일 = D+0  → 9월 28일 = D+49
 */
export function ddayNumber(startISO, now = new Date(), firstDay = 1) {
  const start = parseLocalDate(startISO);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((today - start) / 86400000);
  return diff >= 0 ? diff + (Number(firstDay) === 0 ? 0 : 1) : diff;
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
    num.textContent = ddayText(ddayNumber(cfg.start, new Date(), cfg.firstDay ?? 1));
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
  const player = musicPlayer(cfg);
  const el = h('div', { class: 'home-card music-card dark-card' }, h('div', { class: 'card-kicker' }, h('span', null, 'NOW PLAYING'), h('span', null, 'SIDE A')), player);
  // 페이지를 옮겨도 음악은 계속 재생 (머리글 버튼으로 끌 수 있음)
  el._cleanup = () => player._cleanup?.();
  return el;
}

/* ───────── 두 사람은 지금 무엇을 하고 있을까? ───────── */
function blockRandom(n) {
  let t = (n * 2654435761) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
/**
 * 지금 보여줄 문구 고르기
 *  - 관리자가 문구를 골라뒀으면 그 문구
 *  - 아니면 N시간(기본 3시간)마다 랜덤으로 바뀜.
 *    시간대(0~3시, 3~6시 …)마다 정해지므로 같은 시간엔 모든 방문자가 같은 문구를 봐요.
 */
export function pickStatus(cfg, now = new Date()) {
  const list = (cfg.phrases || []).map((p) => String(p).trim()).filter(Boolean);
  const hours = Math.max(1, Number(cfg.hours) || 3);
  const localHours = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 3600000);
  const block = Math.floor(localHours / hours);
  const start = new Date((block * hours * 3600000) + now.getTimezoneOffset() * 60000);
  const end = new Date(start.getTime() + hours * 3600000);
  if (!list.length) return { text: '', start, end, pinned: false };
  if (cfg.pinned && list.includes(cfg.pinned.trim())) return { text: cfg.pinned.trim(), start, end, pinned: true };
  const idx = (b) => Math.floor(blockRandom(b) * list.length);
  let i = idx(block);
  if (list.length > 1 && i === idx(block - 1)) i = (i + 1) % list.length; // 연속으로 같은 문구 방지
  return { text: list[i], start, end, pinned: false };
}

function nowSection(cfg) {
  const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:00`;
  const bubble = h('p', { class: 'now-text' });
  const when = h('span');
  const sds = [cfg.sd1, cfg.sd2].filter(Boolean);
  let last = '';
  const paint = () => {
    const st = pickStatus(cfg);
    when.textContent = st.pinned ? 'TODAY' : `${hhmm(st.start)} – ${hhmm(st.end)}`;
    if (st.text === last) return;
    last = st.text;
    bubble.textContent = st.text || '관리자 페이지 → 메인 화면에서 문구를 적어주세요.';
    bubble.classList.remove('pop');
    void bubble.offsetWidth;
    bubble.classList.add('pop');
  };
  paint();
  const timer = setInterval(paint, 60 * 1000); // 시간이 바뀌면 자동으로 새 문구
  const el = h('section', { class: 'home-card now-card' },
    h('div', { class: 'card-kicker' }, h('span', null, 'NOW · STATUS REPORT'), when),
    h('h2', { class: 'now-title' }, cfg.title || '두 사람은 지금 무엇을 하고 있을까?'),
    h('div', { class: 'now-body' },
      h('div', { class: ['now-sd', sds.length > 1 && 'two'] }, sds.length ? sds.map((u) => img(u, { alt: '' })) : img('', { emptyLabel: 'SD' })),
      h('div', { class: 'now-bubble' }, bubble)));
  el._cleanup = () => clearInterval(timer);
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

const SECTIONS = { hero: heroSection, dday: ddaySection, music: musicSection, duo: duoSection, now: nowSection, stage: stageSection, note: noteSection };

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

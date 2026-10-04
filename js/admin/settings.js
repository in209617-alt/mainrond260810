// ─────────────────────────────────────────────────────────────
// settings.js — 관리자: 사이트 정보 / 디자인 / 메인 화면 설정
// 모든 값은 데이터베이스의 site_settings 표에 한 번에 저장됩니다.
// ─────────────────────────────────────────────────────────────
import { h, clone, img, append, fill } from '../core/dom.js';
import { store, saveSettings } from '../core/store.js';
import { link } from '../core/router.js';
import { applyTheme, FONTS, PRESETS, loadFont } from '../core/theme.js';
import { DEFAULT_SETTINGS } from '../data/seed.js';
import { field, textInput, textArea, toggle, colorField, imageField, selectInput, audioField, pickMedia, uploadFiles, pickFiles, numberInput } from '../components/fields.js';
import { makeSortable } from '../components/sortable.js';
import { syncCursor, EXAMPLE_CURSOR } from '../components/cursor.js';
import { toast, toastError, busy, confirmDialog } from '../components/ui.js';

/** 공통: 초안(draft)을 고치고 [저장]을 누르면 데이터베이스에 저장 */
function settingsPage(root, title, lead, build, { onChange, onDiscard } = {}) {
  let draft = clone(store.settings);
  let dirty = false;
  const bar = h('div', { class: 'save-bar' });
  const body = h('div', { class: 'admin-form' });
  const changed = () => {
    dirty = true;
    onChange?.(draft);
    paintBar();
  };
  const save = async () => {
    await saveSettings(clone(draft));
    dirty = false;
    paintBar();
  };
  function paintBar() {
    bar.classList.toggle('dirty', dirty);
    fill(bar, 
      h('span', { class: 'save-state' }, dirty ? '● 저장하지 않은 변경사항이 있어요' : '✓ 저장됨'),
      h('span', { class: 'spacer' }),
      dirty && h('button', { class: 'btn btn-sm btn-ghost', onclick: () => { draft = clone(store.settings); dirty = false; onDiscard?.(); paint(); } }, '되돌리기'),
      h('button', { class: 'btn btn-primary', disabled: !dirty, onclick: (e) => busy(e.currentTarget, async () => { try { await save(); toast('저장했어요. 홈페이지에 바로 반영됩니다.', 'success'); } catch (err) { toastError(err); } }) }, '저장'));
  }
  function paint() {
    fill(body, ...[build(draft, changed, paint)].flat());
    paintBar();
  }
  append(root, h('h1', { class: 'admin-title' }, title), lead && h('p', { class: 'admin-lead' }, lead), bar, body);
  paint();
  return async () => {
    if (!dirty) return onDiscard?.();
    try {
      await save();
      toast('변경사항을 자동 저장했어요', 'success');
    } catch (err) {
      onDiscard?.();
      toastError(err);
    }
  };
}

const bind = (obj, key, changed) => (v) => { obj[key] = v; changed(); };
const group = (title, ...children) => h('fieldset', { class: 'group' }, h('legend', null, title), ...children);

/* ───────── 사이트 정보 ───────── */
export function renderSite(root) {
  return settingsPage(root, '사이트 정보', '홈페이지 맨 위 제목과 소개 문구를 바꿉니다.', (d, changed) => {
    const s = d.site;
    return group('기본 정보',
      field('사이트 제목', textInput(s.title, bind(s, 'title', changed))),
      field('메인 화면 인사말', textInput(s.welcome, bind(s, 'welcome', changed)), '메인 화면 맨 위 큰 글씨예요. 예) 어서 오세요!'),
      field('사이트 설명 (메인 상단 한 줄 소개)', textArea(s.subtitle, bind(s, 'subtitle', changed), { rows: 2 })),
      field('머리글 작은 문구', textInput(s.masthead, bind(s, 'masthead', changed)), '제목 왼쪽 위에 작게 표시돼요. 예) PRIVATE ARCHIVE · VOL. 01'),
      field('바닥글 문구', textInput(s.footer, bind(s, 'footer', changed))),
      imageField('브라우저 탭 아이콘 (정사각형 이미지 추천)', s.favicon, bind(s, 'favicon', changed), { folder: 'design', small: true, raw: true, help: '인터넷 창 제목 옆에 작게 보이는 아이콘이에요. 비우면 기본 아이콘을 써요.' }));
  });
}

/* ───────── 디자인 ───────── */
export function renderDesign(root) {
  return settingsPage(root, '디자인', '색상·글꼴·배경을 바꾸면 이 화면에서 바로 미리 보여요. [저장]을 눌러야 방문자에게도 적용됩니다.', (d, changed, repaint) => {
    const t = d.theme;
    const fontSelect = (kind, key) => {
      const sample = h('span', { class: 'font-sample', style: { fontFamily: `'${t[key]}'` } }, '가나다 ABC 2026');
      return h('div', { class: 'field' }, h('span', { class: 'field-label' }, { title: '제목 글꼴', body: '본문 글꼴', label: '타자기(라벨) 글꼴', hand: '손글씨 글꼴' }[kind]),
        h('div', { class: 'row wrap' }, selectInput(FONTS[kind], t[key], (v) => { t[key] = v; loadFont(v); sample.style.fontFamily = `'${v}'`; changed(); }), sample));
    };
    return [
      group('빠른 색 조합',
        h('div', { class: 'preset-row' }, PRESETS.map((p) => h('button', { class: 'preset', onclick: () => { const { name, ...values } = p; Object.assign(t, values); Object.values(values).forEach((v) => typeof v === 'string' && !v.startsWith('#') && loadFont(v)); changed(); repaint(); } },
          h('span', { class: 'preset-sw' }, [p.background, p.primary, p.secondary, p.accent].map((c) => h('i', { style: { background: c } }))), p.name)))),
      group('색상',
        h('div', { class: 'color-grid' },
          colorField('메인 색상 (머리글·어두운 면)', t.primary, bind(t, 'primary', changed)),
          colorField('보조 색상 (종이 색)', t.secondary, bind(t, 'secondary', changed)),
          colorField('포인트 색상 (붉은 강조)', t.accent, bind(t, 'accent', changed)),
          colorField('배경 색상', t.background, bind(t, 'background', changed)),
          colorField('글자 색상 (종이 위 글자)', t.text, bind(t, 'text', changed)))),
      group('글꼴', fontSelect('title', 'fontTitle'), fontSelect('body', 'fontBody'), fontSelect('label', 'fontLabel'), fontSelect('hand', 'fontHand')),
      group('배경',
        imageField('배경 이미지 (선택)', t.bgImage, bind(t, 'bgImage', changed), { folder: 'design', help: '넣지 않으면 배경 색상만 사용해요.' }),
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, '배경 이미지 어둡게 덮기'), h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: t.bgOverlay, oninput: (e) => { t.bgOverlay = Number(e.target.value); changed(); } })),
        toggle('모눈 격자 무늬', t.grid, bind(t, 'grid', changed)),
        toggle('필름 입자(노이즈) 효과', t.grain, bind(t, 'grain', changed))),
      cursorGroup(d, changed, repaint),
      group('종이 · 장식 기본 목록',
        h('p', { class: 'field-help' }, '기록철 페이지에서 고를 수 있는 종이 배경과 장식 이미지 목록입니다.'),
        imageList('종이 배경', d.paperLibrary, (v) => { d.paperLibrary = v; changed(); }, { defaults: DEFAULT_SETTINGS.paperLibrary }),
        imageList('장식 이미지', d.decorLibrary, (v) => { d.decorLibrary = v; changed(); }, { defaults: DEFAULT_SETTINGS.decorLibrary })),
    ];
  }, {
    onChange: (d) => { applyTheme(d.theme); syncCursor(d.cursor); },
    onDiscard: () => { applyTheme(store.settings.theme); syncCursor(store.settings.cursor); },
  });
}

/** 디자인 → 마우스 커서 (이미지 2장: 기본 / 클릭할 때) */
function cursorGroup(d, changed, repaint) {
  d.cursor = { ...clone(DEFAULT_SETTINGS.cursor), ...(d.cursor || {}) };
  const c = d.cursor;
  const HOT = [['0,0', '왼쪽 위 (보통 화살표처럼)'], ['50,0', '가운데 위'], ['50,50', '정가운데'], ['0,100', '왼쪽 아래']];
  const hotNow = `${c.hotX || 0},${c.hotY || 0}`;
  return group('마우스 커서',
    h('p', { class: 'field-help' }, '홈페이지 안에서만 마우스 커서가 이 그림으로 바뀌어요. (휴대폰·태블릿처럼 마우스가 없는 기기에서는 보이지 않아요.) 배경이 투명한 PNG 이미지를 추천해요. 바꾸면 이 화면에서 바로 미리 볼 수 있어요.'),
    toggle('꾸민 마우스 커서 사용', c.on, bind(c, 'on', changed)),
    h('div', { class: 'two-col' },
      imageField('① 기본 커서 (가만히 있을 때)', c.normal, bind(c, 'normal', changed), { folder: 'design', small: true, raw: true }),
      imageField('② 클릭할 때 커서', c.click, bind(c, 'click', changed), { folder: 'design', small: true, raw: true, help: '비우면 클릭할 때도 기본 커서를 보여줘요.' })),
    field('커서 크기 (px)', numberInput(c.size, (v) => { c.size = Math.max(16, Math.min(128, v || 48)); changed(); }, { min: 16, max: 128, step: 4 }), '보통 32~64 사이를 추천해요.'),
    field('클릭되는 지점', selectInput(HOT, HOT.some(([v]) => v === hotNow) ? hotNow : '0,0', (v) => { const [hx, hy] = v.split(',').map(Number); c.hotX = hx; c.hotY = hy; changed(); }), '그림의 어느 부분으로 클릭할지 정해요.'),
    c.normal === EXAMPLE_CURSOR && h('p', { class: 'field-help' }, '※ 지금은 기본 예시 고양이를 쓰고 있어서, 움직이는 동안 굴러가는 그림이 0.3초 간격으로 함께 재생돼요. 직접 올린 이미지는 기본/클릭 2장으로 적용됩니다.'),
    h('div', { class: 'row wrap' },
      h('button', { type: 'button', class: 'btn btn-sm btn-ghost', onclick: () => { d.cursor = clone(DEFAULT_SETTINGS.cursor); changed(); repaint(); } }, '예시 커서로 되돌리기')));
}

/** 이미지 여러 장 목록 편집 (추가/삭제/기본값 복원) */
export function imageList(label, list, onChange, { raw = false, defaults, pixel = false } = {}) {
  let items = [...(list || [])];
  const grid = h('div', { class: ['thumb-list', pixel && 'pixel'] });
  const set = (next) => { items = next; onChange([...items]); paint(); };
  function paint() {
    fill(grid, 
      ...items.map((u, i) => h('div', { class: 'thumb' }, img(u), h('button', { class: 'thumb-x', title: '빼기', onclick: () => set(items.filter((_, j) => j !== i)) }, '✕'))),
      h('button', { class: 'thumb thumb-add', title: '보관함에서 추가', onclick: async () => { const u = await pickMedia(); if (u) set([...items, u]); } }, '+'),
      h('button', { class: 'thumb thumb-add', title: '새로 올리기', onclick: async () => {
        const files = await pickFiles({ multiple: true });
        if (!files.length) return;
        try { const rows = await uploadFiles(files, { folder: 'stage', raw }); set([...items, ...rows.map((r) => r.url)]); } catch (e) { toastError(e); }
      } }, '⇪'));
  }
  paint();
  return h('div', { class: 'field' }, h('div', { class: 'row' }, h('span', { class: 'field-label' }, label), h('span', { class: 'spacer' }), defaults && h('button', { class: 'btn btn-sm btn-ghost', onclick: () => set([...defaults]) }, '기본값')), grid);
}

/* ───────── 메인 화면 ───────── */
const SECTION_NAMES = { hero: '대표 이미지', dday: 'D-Day', music: '음악', duo: '두 캐릭터 소개', now: '두 사람은 지금…', stage: '캐릭터 이동 공간', note: '편집자의 말' };
const SIZES = [['full', '가로 전체'], ['l', '넓게 (2/3)'], ['m', '절반'], ['s', '좁게 (1/3)']];

export function renderHomeSettings(root) {
  return settingsPage(root, '메인 화면', '메인 페이지에 보일 구역을 켜고 끄고, 끌어서 순서를 바꾸고, 각 구역 내용을 수정하세요.', (d, changed, repaint) => {
    const home = d.home;
    // 1) 구역 순서 / 표시
    const list = h('div', { class: 'sort-list' });
    const sorter = makeSortable(list, {
      onEnd: (ids) => {
        home.sections.sort((a, b) => ids.indexOf(a.key) - ids.indexOf(b.key));
        changed();
      },
    });
    home.sections.forEach((s) => {
      const row = h('div', { class: ['sort-item', 'sort-row', !s.on && 'off'], dataset: { id: s.key } },
        h('span', { class: 'drag-handle', title: '끌어서 순서 바꾸기' }, '⋮⋮'),
        h('span', { class: 'sort-name' }, SECTION_NAMES[s.key] || s.key),
        toggle('보이기', s.on, (v) => { s.on = v; row.classList.toggle('off', !v); changed(); }),
        selectInput(SIZES, s.size, (v) => { s.size = v; changed(); }, { 'aria-label': '크기' }),
        h('button', { class: 'btn-icon', title: '위로', onclick: () => sorter.move(row, -1) }, '↑'),
        h('button', { class: 'btn-icon', title: '아래로', onclick: () => sorter.move(row, 1) }, '↓'));
      list.append(row);
    });

    const hero = home.hero;
    const dd = home.dday;
    const mu = home.music;
    const duo = home.duo;
    const st = home.stage;
    const note = home.note;
    const now = home.now;

    return [
      group('구역 배치', h('p', { class: 'field-help' }, '☑ 표시한 구역만 메인에 나와요. 크기: 넓게(2/3) 옆에 좁게(1/3) 구역 두 개가 나란히 들어갑니다.'), list),
      group('대표 이미지',
        imageField('이미지', hero.image, bind(hero, 'image', changed), { folder: 'home' }),
        field('이미지 설명', textInput(hero.caption, bind(hero, 'caption', changed))),
        field('작은 제목', textInput(hero.label, bind(hero, 'label', changed)))),
      group('D-Day',
        field('시작 날짜', h('input', { class: 'input', type: 'date', value: dd.start, onchange: (e) => { dd.start = e.target.value; changed(); } }), '오늘 날짜에 맞춰 자동으로 D+숫자가 계산돼요.'),
        field('세는 방법', selectInput([['1', '시작한 날 = D+1 (기념일 방식, 8/10 시작 → 9/28은 D+50)'], ['0', '시작한 날 = D+0 (8/10 시작 → 9/28은 D+49)']], String(dd.firstDay ?? 1), (v) => { dd.firstDay = Number(v); changed(); })),
        field('제목', textInput(dd.label, bind(dd, 'label', changed))),
        field('작은 설명', textInput(dd.note, bind(dd, 'note', changed)))),
      group('음악',
        field('곡 제목', textInput(mu.title, bind(mu, 'title', changed))),
        field('아티스트 / 설명', textInput(mu.artist, bind(mu, 'artist', changed))),
        audioField('음악 링크', mu.url, bind(mu, 'url', changed))),
      group('두 캐릭터 소개',
        field('구역 제목', textInput(duo.title, bind(duo, 'title', changed))),
        h('div', { class: 'two-col' }, duo.items.map((c, i) => h('div', { class: 'sub-card' },
          h('b', { class: 'label' }, `캐릭터 ${i + 1}`),
          field('이름', textInput(c.name, bind(c, 'name', changed))),
          field('작은 꼬리표', textInput(c.tag, bind(c, 'tag', changed))),
          field('짧은 소개', textArea(c.bio, bind(c, 'bio', changed), { rows: 3 })),
          imageField('프로필 사진', c.photo, bind(c, 'photo', changed), { folder: 'home', small: true }),
          imageField('SD 이미지', c.sd, bind(c, 'sd', changed), { folder: 'home', small: true, raw: true }))))),
      group('캐릭터 이동 공간',
        field('제목', textInput(st.title, bind(st, 'title', changed))),
        field('아래 설명', textInput(st.caption, bind(st, 'caption', changed))),
        toggle('빈티지 필터 (색 바랜 느낌)', st.filter, bind(st, 'filter', changed)),
        h('div', { class: 'row wrap' },
          field('걷는 속도 (1 = 보통)', numberInput(st.speed, bind(st, 'speed', changed), { min: 0.3, max: 3, step: 0.1 })),
          field('공간 높이 (칸 수)', numberInput(st.height, bind(st, 'height', changed), { min: 7, max: 20, step: 1 }))),
        h('div', { class: 'two-col' }, st.chars.map((c, i) => h('div', { class: 'sub-card' },
          h('b', { class: 'label' }, `캐릭터 ${i + 1} 걷기 이미지`),
          imageField('걷기 스프라이트 시트', c.sheet, bind(c, 'sheet', changed), { folder: 'stage', raw: true, small: true, help: '가로: 걷는 동작 칸들 / 세로: 방향 줄' }),
          h('div', { class: 'row wrap' },
            field('한 칸 너비(px)', numberInput(c.fw, bind(c, 'fw', changed), { min: 4, max: 256 })),
            field('한 칸 높이(px)', numberInput(c.fh, bind(c, 'fh', changed), { min: 4, max: 256 })),
            field('동작 칸 수', numberInput(c.frames, bind(c, 'frames', changed), { min: 1, max: 16 }))),
          field('줄 순서 (위에서부터)', textInput(c.order, bind(c, 'order', changed)), 'down(아래), up(위), left(왼쪽), right(오른쪽)을 쉼표로 구분')))),
        h('details', { class: 'more' }, h('summary', null, '배경 타일 · 나무 · 장식 이미지 바꾸기'),
          imageList('잔디 타일 (16×16)', st.ground, bind(st, 'ground', changed), { raw: true, pixel: true, defaults: DEFAULT_SETTINGS.home.stage.ground }),
          imageList('짙은 잔디 타일', st.groundDark, bind(st, 'groundDark', changed), { raw: true, pixel: true, defaults: DEFAULT_SETTINGS.home.stage.groundDark }),
          imageList('길 타일', st.path, bind(st, 'path', changed), { raw: true, pixel: true, defaults: DEFAULT_SETTINGS.home.stage.path }),
          imageList('나무 (위쪽 가장자리)', st.trees, bind(st, 'trees', changed), { raw: true, pixel: true, defaults: DEFAULT_SETTINGS.home.stage.trees }),
          imageList('덤불 · 바위 · 그루터기', st.smalls, bind(st, 'smalls', changed), { raw: true, pixel: true, defaults: DEFAULT_SETTINGS.home.stage.smalls }),
          imageList('꽃 · 버섯 장식', st.decor, bind(st, 'decor', changed), { raw: true, pixel: true, defaults: DEFAULT_SETTINGS.home.stage.decor }),
          imageList('떨어지는 나뭇잎', st.leaves, bind(st, 'leaves', changed), { raw: true, pixel: true, defaults: DEFAULT_SETTINGS.home.stage.leaves }),
          imageField('그림자', st.shadow, bind(st, 'shadow', changed), { folder: 'stage', raw: true, small: true }),
          imageField('하트 이미지 (비우면 기본 도트 하트)', st.heart, bind(st, 'heart', changed), { folder: 'stage', raw: true, small: true }))),
      nowGroup(now, changed),
      group('편집자의 말',
        field('제목', textInput(note.title, bind(note, 'title', changed))),
        field('내용', textArea(note.text, bind(note, 'text', changed), { rows: 5 }))),
      h('p', { class: 'admin-foot' }, h('a', { href: link('/'), target: '_blank' }, '↗ 메인 화면 새 창으로 보기'), ' · ', h('button', { class: 'btn btn-sm btn-ghost', onclick: async () => {
        if (!(await confirmDialog('캐릭터 이동 공간 설정을 기본값(낑냐마을 리소스)으로 되돌릴까요?'))) return;
        home.stage = clone(DEFAULT_SETTINGS.home.stage);
        changed();
        repaint();
      } }, '캐릭터 공간 기본값 복원')),
    ];
  });
}

/* 메인 화면 → "두 사람은 지금 무엇을 하고 있을까?" 설정 */
function nowGroup(now, changed) {
  const listBox = h('div', { class: 'phrase-list' });
  const pinnedBox = h('div');
  const paintPinned = () => {
    const opts = [['', `🎲 랜덤 (${now.hours || 3}시간마다 자동으로 바뀜)`], ...now.phrases.filter((p) => p.trim()).map((p) => [p, '📌 ' + p])];
    if (now.pinned && !now.phrases.includes(now.pinned)) now.pinned = '';
    fill(pinnedBox, field('지금 띄울 문구', selectInput(opts, now.pinned || '', (v) => { now.pinned = v; changed(); }), '문구를 고르면 그 문구만 계속 보여요. 고르지 않으면 목록에서 랜덤으로 나옵니다.'));
  };
  const paintList = () => {
    fill(listBox, ...now.phrases.map((p, i) => h('div', { class: 'phrase-row' },
      h('span', { class: 'phrase-no' }, String(i + 1).padStart(2, '0')),
      h('input', { class: 'input', value: p, placeholder: '예) 둘은 같이 산책하고 있어요.', oninput: (e) => { now.phrases[i] = e.target.value; changed(); }, onchange: paintPinned }),
      h('button', { type: 'button', class: 'btn-icon danger', title: '문구 삭제', onclick: () => { now.phrases.splice(i, 1); changed(); paintList(); paintPinned(); } }, '✕'))));
  };
  paintList();
  paintPinned();
  return group('두 사람은 지금 무엇을 하고 있을까?',
    field('제목', textInput(now.title, bind(now, 'title', changed))),
    h('div', { class: 'two-col' },
      imageField('SD 이미지 1', now.sd1, bind(now, 'sd1', changed), { folder: 'home', small: true, raw: true }),
      imageField('SD 이미지 2 (선택)', now.sd2, bind(now, 'sd2', changed), { folder: 'home', small: true, raw: true, help: '둘이 함께 있는 그림 한 장이면 1번만 넣어도 돼요.' })),
    h('div', { class: 'field' }, h('span', { class: 'field-label' }, `문구 목록 (${now.phrases.length}개)`), listBox,
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn btn-sm', onclick: () => { now.phrases.push(''); changed(); paintList(); listBox.querySelector('.phrase-row:last-child input')?.focus(); } }, '+ 문구 추가'))),
    pinnedBox,
    field('랜덤 문구가 바뀌는 간격 (시간)', numberInput(now.hours, (v) => { now.hours = Math.max(1, Math.min(24, v || 3)); changed(); paintPinned(); }, { min: 1, max: 24, step: 1 }), '기본 3시간. 0~3시, 3~6시… 처럼 시간대마다 바뀌고, 같은 시간엔 모든 방문자가 같은 문구를 봐요.'));
}

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
      field('사이트 설명 (메인 상단 한 줄 소개)', textArea(s.subtitle, bind(s, 'subtitle', changed), { rows: 2 })),
      field('머리글 작은 문구', textInput(s.masthead, bind(s, 'masthead', changed)), '제목 왼쪽 위에 작게 표시돼요. 예) PRIVATE ARCHIVE · VOL. 01'),
      field('바닥글 문구', textInput(s.footer, bind(s, 'footer', changed))));
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
        h('div', { class: 'preset-row' }, PRESETS.map((p) => h('button', { class: 'preset', onclick: () => { Object.assign(t, { primary: p.primary, secondary: p.secondary, accent: p.accent, background: p.background, text: p.text }); changed(); repaint(); } },
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
      group('종이 · 장식 기본 목록',
        h('p', { class: 'field-help' }, '기록철 페이지에서 고를 수 있는 종이 배경과 장식 이미지 목록입니다.'),
        imageList('종이 배경', d.paperLibrary, (v) => { d.paperLibrary = v; changed(); }, { defaults: DEFAULT_SETTINGS.paperLibrary }),
        imageList('장식 이미지', d.decorLibrary, (v) => { d.decorLibrary = v; changed(); }, { defaults: DEFAULT_SETTINGS.decorLibrary })),
    ];
  }, { onChange: (d) => applyTheme(d.theme), onDiscard: () => applyTheme(store.settings.theme) });
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
const SECTION_NAMES = { hero: '대표 이미지', dday: 'D-Day', music: '음악', duo: '두 캐릭터 소개', stage: '캐릭터 이동 공간', note: '편집자의 말' };
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

    return [
      group('구역 배치', h('p', { class: 'field-help' }, '☑ 표시한 구역만 메인에 나와요. 크기: 넓게(2/3) 옆에 좁게(1/3) 구역 두 개가 나란히 들어갑니다.'), list),
      group('대표 이미지',
        imageField('이미지', hero.image, bind(hero, 'image', changed), { folder: 'home' }),
        field('이미지 설명', textInput(hero.caption, bind(hero, 'caption', changed))),
        field('작은 제목', textInput(hero.label, bind(hero, 'label', changed)))),
      group('D-Day',
        field('시작 날짜 (D+0 인 날)', h('input', { class: 'input', type: 'date', value: dd.start, onchange: (e) => { dd.start = e.target.value; changed(); } }), '오늘 날짜에 맞춰 자동으로 D+숫자가 계산돼요.'),
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

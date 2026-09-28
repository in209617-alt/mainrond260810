// ─────────────────────────────────────────────────────────────
// media.js — 관리자: 이미지 보관함 / 편집자(승인 이메일) 관리
// ─────────────────────────────────────────────────────────────
import { h, img, fmtDate, append, fill } from '../core/dom.js';
import { store } from '../core/store.js';
import { uploadFiles, dropZone, formatBytes, selectInput } from '../components/fields.js';
import { toast, toastError, confirmDialog, spinner, busy } from '../components/ui.js';

const FOLDERS = [['', '전체'], ['uploads', '일반'], ['home', '메인'], ['papers', '기록철'], ['series', '시리즈'], ['gallery', '갤러리'], ['posts', '로그'], ['pages', '페이지'], ['design', '디자인'], ['stage', '캐릭터 공간'], ['audio', '음악']];

export async function renderMedia(root) {
  let folder = '';
  const grid = h('div', { class: 'media-grid admin-media' });
  const progress = h('p', { class: 'field-help' });
  append(root, 
    h('h1', { class: 'admin-title' }, '이미지 보관함'),
    h('p', { class: 'admin-lead' }, '지금까지 올린 파일이 모두 모여 있어요. 여기서 지우면 저장소에서도 사라지므로, 홈페이지에서 쓰는 중인 이미지는 지우지 마세요.'),
    dropZone({
      onFiles: async (files) => {
        try {
          await uploadFiles(files, { folder: 'uploads', onProgress: (i, n, name) => (progress.textContent = `업로드 중 ${i}/${n} · ${name}`) });
          progress.textContent = `${files.length}개 올렸어요.`;
          load();
        } catch (e) { progress.textContent = ''; toastError(e); }
      },
    }),
    progress,
    h('div', { class: 'row', style: { margin: '14px 0' } }, h('span', { class: 'field-label' }, '분류'), selectInput(FOLDERS, '', (v) => { folder = v; load(); })),
    grid);

  async function load() {
    fill(grid, spinner());
    try {
      let rows = await store.api.select('media', { order: [['created_at', false]] });
      if (folder) rows = rows.filter((r) => r.folder === folder);
      fill(grid, ...(rows.length ? rows.map(tile) : [h('p', { class: 'muted' }, '파일이 없어요.')]));
    } catch (e) { fill(grid, h('p', null, e.message)); }
  }
  function tile(r) {
    const isImg = (r.mime || '').startsWith('image/');
    return h('div', { class: 'media-card' },
      h('div', { class: 'media-card-pic' }, isImg ? img(r.url) : h('span', { class: 'label' }, (r.mime || 'file').split('/').pop().toUpperCase())),
      h('div', { class: 'media-card-meta' }, h('span', { class: 'media-name', title: r.name }, r.name), h('span', { class: 'muted' }, `${formatBytes(r.size)} · ${fmtDate(r.created_at)}`)),
      h('div', { class: 'row' },
        h('button', { class: 'btn btn-sm', onclick: async () => { try { await navigator.clipboard.writeText(r.url); toast('주소를 복사했어요'); } catch { prompt('주소', r.url); } } }, '주소 복사'),
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn-icon danger', title: '삭제', onclick: async () => {
          if (!(await confirmDialog(`"${r.name}" 파일을 삭제할까요?\n홈페이지에서 쓰고 있다면 그 자리는 빈 이미지가 됩니다.`, { ok: '삭제', danger: true }))) return;
          try { await store.api.removeMedia(r); load(); } catch (e) { toastError(e); }
        } }, '🗑')));
  }
  load();
}

export async function renderEditors(root) {
  const list = h('div', { class: 'sort-list' }, spinner());
  const email = h('input', { class: 'input', type: 'email', placeholder: 'friend@example.com' });
  let role = 'editor';
  append(root, 
    h('h1', { class: 'admin-title' }, '편집자 관리'),
    h('div', { class: 'admin-note' },
      h('b', null, '승인된 이메일 = 편집 권한. '),
      '여기에 추가한 이메일로 로그인한 사람만 홈페이지를 수정할 수 있어요. 목록에 없는 사람은 로그인해도 Viewer(보기 전용)입니다. ',
      '이 확인은 브라우저가 아니라 데이터베이스 서버의 보안 규칙이 하므로, 코드를 조작해도 우회할 수 없어요.'),
    h('fieldset', { class: 'group' }, h('legend', null, '이메일 추가'),
      h('div', { class: 'row wrap' }, email,
        selectInput([['editor', '편집자 (콘텐츠·디자인 수정)'], ['admin', '관리자 (+ 편집자 관리)']], role, (v) => (role = v)),
        h('button', { class: 'btn btn-primary', onclick: (e) => busy(e.currentTarget, async () => {
          const v = email.value.trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return toast('올바른 이메일을 입력하세요', 'error');
          try { await store.api.insert('editors', { email: v, role }); email.value = ''; toast('추가했어요. 이제 그 이메일로 로그인하면 편집할 수 있어요.', 'success'); load(); } catch (err) { toastError(err); }
        }) }, '추가'))),
    list);

  async function load() {
    try {
      const rows = await store.api.select('editors', { order: [['created_at', true]] });
      fill(list, ...rows.map((r) => {
        const me = r.email.toLowerCase() === (store.user?.email || '').toLowerCase();
        return h('div', { class: 'sort-row' },
          h('div', { class: 'sort-name' }, h('b', null, r.email), me && h('span', { class: 'type-badge' }, '나')),
          selectInput([['editor', '편집자'], ['admin', '관리자']], r.role, async (v) => { try { await store.api.update('editors', r.id, { role: v }); toast('권한을 바꿨어요', 'success'); } catch (e) { toastError(e); load(); } }, { disabled: me }),
          !me && h('button', { class: 'btn btn-sm btn-danger', onclick: async () => {
            if (!(await confirmDialog(`${r.email} 의 편집 권한을 없앨까요?`, { ok: '삭제', danger: true }))) return;
            try { await store.api.remove('editors', r.id); load(); } catch (e) { toastError(e); }
          } }, '권한 삭제'));
      }));
    } catch (e) { fill(list, h('p', null, e.message)); }
  }
  load();
}

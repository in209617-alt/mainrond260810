// ─────────────────────────────────────────────────────────────
// fields.js — 관리자 화면의 입력 칸들 (글자, 색상, 이미지 업로드 등)
// ─────────────────────────────────────────────────────────────
import { h, safeUrl, img, fill } from '../core/dom.js';
import { store } from '../core/store.js';
import { prepareImage, formatBytes } from '../core/image.js';
import { modal, toast, toastError, spinner } from './ui.js';

export function field(label, control, help) {
  return h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), control, help && h('span', { class: 'field-help' }, help));
}

export function textInput(value, onInput, attrs = {}) {
  return h('input', { class: 'input', type: 'text', value: value ?? '', oninput: (e) => onInput(e.target.value), ...attrs });
}

export function textArea(value, onInput, attrs = {}) {
  const ta = h('textarea', { class: 'input textarea', rows: attrs.rows || 3, oninput: (e) => { onInput(e.target.value); autoGrow(ta); }, ...attrs });
  ta.value = value ?? '';
  requestAnimationFrame(() => autoGrow(ta));
  return ta;
}
function autoGrow(ta) {
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight + 2, 900) + 'px';
}

export function numberInput(value, onInput, attrs = {}) {
  return h('input', { class: 'input input-num', type: 'number', value: value ?? 0, oninput: (e) => onInput(Number(e.target.value)), ...attrs });
}

export function selectInput(options, value, onChange, attrs = {}) {
  const s = h(
    'select',
    { class: 'input', onchange: (e) => onChange(e.target.value), ...attrs },
    options.map((o) => {
      const [v, label] = Array.isArray(o) ? o : [o, o];
      return h('option', { value: v, selected: v === value }, label);
    })
  );
  return s;
}

export function toggle(label, checked, onChange) {
  return h(
    'label',
    { class: 'toggle' },
    h('input', { type: 'checkbox', checked, onchange: (e) => onChange(e.target.checked) }),
    h('span', { class: 'toggle-track' }),
    h('span', null, label)
  );
}

export function colorField(label, value, onChange) {
  const text = h('input', { class: 'input input-hex', type: 'text', value, maxlength: 7 });
  const picker = h('input', { class: 'color-swatch', type: 'color', value });
  picker.addEventListener('input', () => {
    text.value = picker.value;
    onChange(picker.value);
  });
  text.addEventListener('change', () => {
    if (/^#[0-9a-f]{6}$/i.test(text.value)) {
      picker.value = text.value;
      onChange(text.value);
    } else text.value = picker.value;
  });
  return h('div', { class: 'field color-field' }, h('span', { class: 'field-label' }, label), h('div', { class: 'row' }, picker, text));
}

/** 파일 여러 개 업로드 → 저장된 media 목록 반환 */
export async function uploadFiles(files, { folder = 'uploads', raw = false, onProgress } = {}) {
  const out = [];
  let i = 0;
  for (const file of files) {
    i += 1;
    onProgress?.(i, files.length, file.name);
    const prepared = file.type.startsWith('image/') ? await prepareImage(file, { raw }) : file;
    out.push(await store.api.upload(prepared, folder));
  }
  return out;
}

function pickFiles({ accept = 'image/*', multiple = false } = {}) {
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', accept, multiple, style: { display: 'none' } });
    input.addEventListener('change', () => {
      resolve([...input.files]);
      input.remove();
    });
    document.body.append(input);
    input.click();
  });
}

/**
 * 이미지 입력 칸: 미리보기 + [업로드] [보관함에서 선택] [주소 입력] [지우기]
 * raw: true 면 줄이지 않고 원본 그대로 (도트 스프라이트용)
 */
export function imageField(label, value, onChange, { folder = 'uploads', raw = false, help, accept = 'image/*', small = false } = {}) {
  let current = value || '';
  const preview = h('div', { class: ['img-field-preview', small && 'small', raw && 'pixel'] });
  const paint = () => fill(preview, current ? img(current) : h('span', { class: 'muted' }, '이미지 없음'));
  const set = (url) => {
    current = url || '';
    paint();
    onChange(current);
  };
  paint();
  const status = h('span', { class: 'field-help' }, help || '');
  const buttons = h(
    'div',
    { class: 'row wrap' },
    h('button', {
      type: 'button',
      class: 'btn btn-sm',
      onclick: async () => {
        const [file] = await pickFiles({ accept });
        if (!file) return;
        status.textContent = '업로드 중…';
        try {
          const [row] = await uploadFiles([file], { folder, raw });
          set(row.url);
          status.textContent = '업로드 완료 · 저장 버튼을 눌러야 반영돼요';
        } catch (e) {
          status.textContent = '';
          toastError(e);
        }
      },
    }, '업로드'),
    h('button', { type: 'button', class: 'btn btn-sm', onclick: async () => { const url = await pickMedia(); if (url) set(url); } }, '보관함에서 선택'),
    h('button', {
      type: 'button',
      class: 'btn btn-sm btn-ghost',
      onclick: () => {
        const u = prompt('이미지 주소(https://...)를 붙여 넣으세요', current);
        if (u === null) return;
        if (u && !safeUrl(u)) return toast('https:// 로 시작하는 주소만 쓸 수 있어요', 'error');
        set(u.trim());
      },
    }, '주소 입력'),
    h('button', { type: 'button', class: 'btn btn-sm btn-ghost', onclick: () => set('') }, '지우기')
  );
  return h('div', { class: 'field img-field' }, label && h('span', { class: 'field-label' }, label), h('div', { class: 'img-field-body' }, preview, h('div', { class: 'img-field-side' }, buttons, status)));
}

/** 음악/오디오 파일 입력 */
export function audioField(label, value, onChange) {
  const input = textInput(value, onChange, { placeholder: 'https://youtu.be/... 또는 mp3 주소' });
  const status = h('span', { class: 'field-help' }, 'YouTube · SoundCloud · Spotify 링크 또는 mp3 파일을 쓸 수 있어요.');
  const up = h('button', {
    type: 'button',
    class: 'btn btn-sm',
    onclick: async () => {
      const [file] = await pickFiles({ accept: 'audio/*' });
      if (!file) return;
      status.textContent = '업로드 중…';
      try {
        const [row] = await uploadFiles([file], { folder: 'audio' });
        input.value = row.url;
        onChange(row.url);
        status.textContent = '업로드 완료 · 저장 버튼을 눌러주세요';
      } catch (e) {
        status.textContent = '';
        toastError(e);
      }
    },
  }, 'mp3 파일 올리기');
  return h('div', { class: 'field' }, h('span', { class: 'field-label' }, label), h('div', { class: 'row' }, input, up), status);
}

/** 이미지 보관함 팝업 → 고른 이미지 주소 반환 */
export function pickMedia({ includeDefaults = true } = {}) {
  return new Promise((resolve) => {
    let chosen = null;
    const grid = h('div', { class: 'media-grid' }, spinner());
    const m = modal({ title: '이미지 보관함', wide: true, content: h('div', null, h('div', { class: 'row wrap media-toolbar' },
      h('button', {
        class: 'btn btn-primary btn-sm',
        onclick: async () => {
          const files = await pickFiles({ multiple: true });
          if (!files.length) return;
          try {
            await uploadFiles(files, { folder: 'uploads' });
            load();
          } catch (e) { toastError(e); }
        },
      }, '+ 새 이미지 올리기'),
      h('span', { class: 'field-help' }, '이미지를 누르면 선택됩니다.')), grid), onClose: () => resolve(chosen) });
    const choose = (url) => {
      chosen = url;
      m.close();
    };
    const tile = (url, name) => h('button', { class: 'media-tile', title: name || '', onclick: () => choose(url) }, img(url), name && h('span', { class: 'media-name' }, name));
    async function load() {
      try {
        const rows = (await store.api.select('media', { order: [['created_at', false]] })).filter((r) => (r.mime || '').startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)/i.test(r.url));
        const defaults = includeDefaults ? [...store.settings.decorLibrary, ...store.settings.paperLibrary] : [];
        fill(grid, 
          ...(rows.length ? [] : [h('p', { class: 'muted' }, '아직 올린 이미지가 없어요.')]),
          ...rows.map((r) => tile(r.url, r.name)),
          defaults.length ? h('div', { class: 'media-sep' }, '기본 제공 장식 · 종이') : null,
          ...defaults.map((u) => tile(u, u.split('/').pop()))
        );
      } catch (e) {
        fill(grid, h('p', null, e.message));
      }
    }
    load();
  });
}

/** 여러 장 끌어다 놓는 업로드 영역 */
export function dropZone({ onFiles, label = '여기로 이미지를 끌어다 놓거나 눌러서 여러 장 선택', accept = 'image/*' }) {
  const zone = h('div', { class: 'dropzone', tabindex: 0, role: 'button' }, h('span', null, label));
  const open = async () => {
    const files = await pickFiles({ accept, multiple: true });
    if (files.length) onFiles(files);
  };
  zone.addEventListener('click', open);
  zone.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && open());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('over');
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    if (files.length) onFiles(files);
  });
  return zone;
}

export { pickFiles, formatBytes };

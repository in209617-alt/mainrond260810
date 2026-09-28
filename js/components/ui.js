// ─────────────────────────────────────────────────────────────
// ui.js — 알림 메시지, 확인 창, 팝업 창 같은 공통 화면 부품
// ─────────────────────────────────────────────────────────────
import { h } from '../core/dom.js';

let toastBox;
export function toast(message, type = 'info', ms = 3200) {
  if (!toastBox) {
    toastBox = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(toastBox);
  }
  const t = h('div', { class: ['toast', 'toast-' + type] }, message);
  toastBox.append(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

export function toastError(e) {
  console.error(e);
  toast(e?.message || String(e), 'error', 5200);
}

/** 팝업 창. content 는 요소, 반환값의 close() 로 닫음 */
export function modal({ title, content, wide = false, onClose } = {}) {
  const close = () => {
    overlay.classList.add('out');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => overlay.remove(), 180);
    onClose?.();
  };
  const onKey = (e) => e.key === 'Escape' && close();
  const overlay = h(
    'div',
    { class: 'modal-overlay', onclick: (e) => e.target === overlay && close() },
    h(
      'div',
      { class: ['modal', wide && 'modal-wide'], role: 'dialog', 'aria-modal': 'true', 'aria-label': title || '' },
      h('div', { class: 'modal-head' }, h('span', { class: 'modal-title' }, title || ''), h('button', { class: 'btn-icon', 'aria-label': '닫기', onclick: close }, '✕')),
      h('div', { class: 'modal-body' }, content)
    )
  );
  document.addEventListener('keydown', onKey);
  document.body.append(overlay);
  return { close, el: overlay };
}

/** "정말 삭제할까요?" 같은 확인 창 → true/false */
export function confirmDialog(message, { ok = '확인', danger = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      m.close();
      resolve(v);
    };
    const m = modal({
      title: '확인',
      onClose: () => finish(false),
      content: h(
        'div',
        { class: 'confirm' },
        h('p', null, message),
        h(
          'div',
          { class: 'row-end' },
          h('button', { class: 'btn', onclick: () => finish(false) }, '취소'),
          h('button', { class: ['btn', danger ? 'btn-danger' : 'btn-primary'], onclick: () => finish(true) }, ok)
        )
      ),
    });
  });
}

export function spinner(label = '불러오는 중…') {
  return h('div', { class: 'loading' }, h('span', { class: 'loading-reel' }), h('span', null, label));
}

/** 버튼을 누르는 동안 "저장 중…" 표시하고 두 번 눌리지 않게 막기 */
export async function busy(button, fn, label = '저장 중…') {
  const old = button.textContent;
  button.disabled = true;
  button.textContent = label;
  try {
    return await fn();
  } finally {
    button.disabled = false;
    button.textContent = old;
  }
}

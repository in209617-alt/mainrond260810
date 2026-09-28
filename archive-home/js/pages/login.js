// ─────────────────────────────────────────────────────────────
// login.js — 편집자 로그인 (이메일로 로그인 링크/코드 받기)
// 비밀번호가 없습니다. 승인된 이메일인지는 데이터베이스(서버)가 확인해요.
// ─────────────────────────────────────────────────────────────
import { h, append } from '../core/dom.js';
import { store } from '../core/store.js';
import { link, navigate } from '../core/router.js';
import { toast, toastError, busy } from '../components/ui.js';

export async function renderLogin(root) {
  document.title = '로그인 · ' + store.settings.site.title;
  const demo = store.api.mode === 'demo';

  if (store.user) {
    append(root, h('div', { class: 'notice login-card' },
      h('div', { class: 'page-kicker' }, 'SIGNED IN'),
      h('h1', { class: 'page-title' }, '로그인됨'),
      h('p', null, store.user.email),
      h('p', { class: 'muted' }, store.canEdit ? `권한: ${store.role === 'admin' ? '관리자' : '편집자'}` : '권한: Viewer (편집 권한이 없는 이메일이에요. 관리자에게 이메일 승인을 요청하세요.)'),
      h('div', { class: 'row-end' }, store.canEdit && h('a', { class: 'btn btn-primary', href: link('/admin') }, '관리자 페이지'), h('button', { class: 'btn', onclick: () => store.api.signOut() }, '로그아웃'))));
    return;
  }

  const email = h('input', { class: 'input', type: 'email', required: true, placeholder: 'you@example.com', autocomplete: 'email', value: demo ? 'demo@example.com' : '' });
  const codeBox = h('div', { class: 'code-box', hidden: true });
  const status = h('p', { class: 'field-help' });

  const form = h('form', {
    class: 'stack',
    onsubmit: async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type=submit]');
      await busy(btn, async () => {
        try {
          localStorage.setItem('afterLogin', '/admin');
          await store.api.sendLoginEmail(email.value.trim());
          if (demo) return; // 데모는 바로 로그인됨
          status.textContent = `${email.value} 로 로그인 메일을 보냈어요. 메일의 링크를 "이 브라우저"에서 눌러주세요.`;
          codeBox.hidden = false;
        } catch (err) {
          toastError(err);
        }
      }, '보내는 중…');
    },
  },
  h('label', { class: 'field' }, h('span', { class: 'field-label' }, '이메일'), email),
  h('button', { class: 'btn btn-primary', type: 'submit' }, demo ? '데모로 로그인' : '로그인 메일 받기'),
  status);

  const code = h('input', { class: 'input', inputmode: 'numeric', maxlength: 10, placeholder: '메일 속 숫자 코드' });
  codeBox.append(
    h('p', { class: 'field-help' }, '메일에 숫자 코드가 있다면 여기에 입력해도 됩니다.'),
    h('div', { class: 'row' }, code, h('button', {
      class: 'btn',
      onclick: async (e) => {
        await busy(e.currentTarget, async () => {
          try {
            await store.api.verifyCode(email.value.trim(), code.value.trim());
            toast('로그인했어요', 'success');
            navigate('/admin');
          } catch (err) {
            toastError(err);
          }
        }, '확인 중…');
      },
    }, '코드로 로그인')));

  append(root, h('div', { class: 'notice login-card' },
    h('div', { class: 'page-kicker' }, 'EDITOR ACCESS'),
    h('h1', { class: 'page-title' }, '편집자 로그인'),
    h('p', { class: 'muted' }, demo ? '지금은 데모 모드예요. 아무 이메일로나 바로 로그인되고, 내용은 이 브라우저에만 저장됩니다.' : '승인된 이메일로 로그인하면 편집 권한이 생깁니다. 비밀번호는 필요 없어요.'),
    form,
    codeBox));
}

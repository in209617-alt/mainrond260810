// ─────────────────────────────────────────────────────────────
// supabase.js — 실제 데이터베이스(Supabase)와 연결하는 부분
// config.js 에 주소와 키가 들어 있으면 이 파일이 사용됩니다.
//
// ※ 보안 안내: 여기서 쓰는 anon key 는 "공개용 열쇠"라 사이트에 드러나도 괜찮습니다.
//   누가 수정할 수 있는지는 supabase/schema.sql 의 보안 규칙(RLS)이
//   서버에서 승인된 이메일인지 확인해서 결정합니다.
// ─────────────────────────────────────────────────────────────

const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const BUCKET = 'media';

export async function createSupabaseBackend(url, key) {
  const { createClient } = await import(SUPABASE_CDN);
  const sb = createClient(url, key, {
    auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
  });

  // 로그인 링크를 누르고 돌아왔을 때 주소에 붙은 ?code=... 를 정리
  const params = new URLSearchParams(location.search);
  let loginError = params.get('error_description') || '';
  if (params.has('code') || params.has('error')) {
    try {
      await sb.auth.getSession(); // 이 과정에서 로그인 코드가 세션으로 교환됩니다
    } catch (e) {
      loginError = e.message;
    }
    history.replaceState(null, '', location.pathname + location.hash);
  }

  const must = ({ data, error }) => {
    if (error) throw new Error(translateError(error));
    return data;
  };

  const api = {
    mode: 'supabase',
    loginError,

    // ── 데이터 읽기/쓰기 ──
    async select(table, { eq = {}, order = [['sort_order', true]] } = {}) {
      let q = sb.from(table).select('*');
      for (const [k, v] of Object.entries(eq)) q = q.eq(k, v);
      for (const [col, asc] of order) q = q.order(col, { ascending: asc });
      return must(await q);
    },
    async get(table, id) {
      return must(await sb.from(table).select('*').eq('id', id).maybeSingle());
    },
    async insert(table, row) {
      return must(await sb.from(table).insert(row).select().single());
    },
    async insertMany(table, rows) {
      if (!rows.length) return [];
      return must(await sb.from(table).insert(rows).select());
    },
    async update(table, id, patch) {
      return must(await sb.from(table).update(patch).eq('id', id).select().single());
    },
    async remove(table, id) {
      must(await sb.from(table).delete().eq('id', id));
    },
    async reorder(table, ids) {
      await Promise.all(ids.map((id, i) => sb.from(table).update({ sort_order: i }).eq('id', id).then(must)));
    },

    // ── 사이트 설정 (한 줄짜리 표) ──
    async getSettings() {
      const row = must(await sb.from('site_settings').select('data').eq('id', 1).maybeSingle());
      return row ? row.data : null;
    },
    async saveSettings(data) {
      must(await sb.from('site_settings').upsert({ id: 1, data, updated_at: new Date().toISOString() }));
    },

    // ── 이미지/파일 저장소 ──
    async upload(file, folder = 'uploads') {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
      const d = new Date();
      const path = `${folder}/${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      must(await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false }));
      const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
      return api.insert('media', { path, url: data.publicUrl, name: file.name, size: file.size, mime: file.type, folder });
    },
    async removeMedia(row) {
      if (row.path) must(await sb.storage.from(BUCKET).remove([row.path]));
      await api.remove('media', row.id);
    },
    async removeMediaByUrl(url) {
      if (!url) return;
      const rows = must(await sb.from('media').select('*').eq('url', url));
      for (const r of rows) await api.removeMedia(r);
    },

    // ── 로그인 ──
    async getUser() {
      const { data } = await sb.auth.getSession();
      return data.session?.user ?? null;
    },
    onAuthChange(cb) {
      sb.auth.onAuthStateChange((_event, session) => cb(session?.user ?? null));
    },
    async sendLoginEmail(email) {
      const redirect = location.origin + location.pathname;
      must(await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect, shouldCreateUser: true } }));
    },
    async signInWithPassword(email, password) {
      must(await sb.auth.signInWithPassword({ email, password }));
    },
    async verifyCode(email, token) {
      must(await sb.auth.verifyOtp({ email, token, type: 'email' }));
    },
    async signOut() {
      await sb.auth.signOut();
    },
    /** 서버(데이터베이스)에 "내 권한"을 물어봄 → 'admin' | 'editor' | 'viewer' */
    async getRole() {
      const { data, error } = await sb.rpc('my_role');
      if (error) return 'viewer';
      return data || 'viewer';
    },
  };
  return api;
}

function translateError(error) {
  const msg = error.message || String(error);
  if (/row-level security|permission denied|violates row-level/i.test(msg)) return '권한이 없습니다. 승인된 편집자 이메일로 로그인했는지 확인해 주세요.';
  if (/JWT|expired/i.test(msg)) return '로그인이 만료되었습니다. 다시 로그인해 주세요.';
  if (/email rate limit/i.test(msg)) return '무료 메일 발송 한도(시간당 몇 통)를 넘었어요. 1시간쯤 뒤에 다시 시도하거나, 아래 "비밀번호로 로그인"을 사용해 주세요.';
  { const sec = msg.match(/after (\d+) seconds?/i); if (sec) return `같은 이메일로는 ${sec[1]}초 뒤에 다시 요청할 수 있어요. 방금 받은 메일이 있다면 그 메일의 링크를 사용하세요.`; }
  if (/rate limit|security purposes/i.test(msg)) return '너무 자주 요청했어요. 잠시 뒤에 다시 시도하거나, 아래 "비밀번호로 로그인"을 사용해 주세요.';
  if (/Invalid login credentials/i.test(msg)) return '이메일 또는 비밀번호가 맞지 않아요.';
  if (/Email not confirmed/i.test(msg)) return '이메일 인증이 안 된 계정이에요. Supabase에서 사용자를 만들 때 "Auto Confirm User"를 체크해 주세요.';
  if (/Token has expired|invalid/i.test(msg) && /token|otp/i.test(msg)) return '코드가 틀렸거나 만료됐어요. 가장 최근에 받은 메일의 코드를 입력해 주세요.';
  if (/duplicate key.*slug/i.test(msg)) return '같은 주소(slug)를 쓰는 페이지가 이미 있어요. 다른 주소를 써 주세요.';
  if (/duplicate key/i.test(msg)) return '이미 같은 값이 있어요.';
  if (/Payload too large|exceeded the maximum/i.test(msg)) return '파일이 너무 큽니다 (무료 플랜: 파일당 50MB 이하).';
  if (/relation .* does not exist|Could not find the table/i.test(msg)) return '데이터베이스 표가 없습니다. README의 "schema.sql 실행" 단계를 진행해 주세요.';
  return msg;
}

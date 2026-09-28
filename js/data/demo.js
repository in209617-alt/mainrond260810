// ─────────────────────────────────────────────────────────────
// demo.js — "데모 모드" 저장소
// config.js 에 Supabase 정보를 아직 넣지 않았을 때 쓰입니다.
// 내용은 지금 쓰는 브라우저에만 임시로 저장되므로 다른 사람에게는 보이지 않아요.
// 실제 운영에서는 Supabase(진짜 데이터베이스)를 사용합니다.
// ─────────────────────────────────────────────────────────────
import { uid, clone } from '../core/dom.js';
import { buildSeed } from './seed.js';
import { fileToDataURL } from '../core/image.js';

const KEY = 'archive-demo-db-v1';
const TABLES = ['pages', 'papers', 'series', 'posts', 'gallery_categories', 'gallery_images', 'media', 'editors'];

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* 저장소를 쓸 수 없는 환경 */
  }
  const seed = buildSeed();
  const db = { settings: seed.settings, user: null };
  for (const t of TABLES) db[t] = seed[t] ? clone(seed[t]) : [];
  db.editors = [{ id: uid(), email: 'demo@example.com', role: 'admin', note: '데모 계정' }];
  return db;
}

export function createDemoBackend() {
  let db = load();
  const authListeners = new Set();
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {
      throw new Error('데모 모드 저장 공간(브라우저 5MB)이 가득 찼어요. 큰 이미지는 실제 Supabase 연결 후 올려주세요.');
    }
  };
  const table = (t) => (db[t] ||= []);
  const now = () => new Date().toISOString();
  const requireEditor = () => {
    if (!db.user) throw new Error('권한이 없습니다. (데모) 로그인해 주세요.');
  };

  const api = {
    mode: 'demo',
    loginError: '',
    async select(t, { eq = {}, order = [['sort_order', true]] } = {}) {
      let rows = table(t).filter((r) => Object.entries(eq).every(([k, v]) => r[k] === v));
      rows = [...rows].sort((a, b) => {
        for (const [col, asc] of order) {
          const av = a[col] ?? '';
          const bv = b[col] ?? '';
          if (av < bv) return asc ? -1 : 1;
          if (av > bv) return asc ? 1 : -1;
        }
        return 0;
      });
      return clone(rows);
    },
    async get(t, id) {
      return clone(table(t).find((r) => r.id === id) ?? null);
    },
    async insert(t, row) {
      requireEditor();
      if (t === 'pages' && table(t).some((p) => p.slug === row.slug)) throw new Error('같은 주소(slug)를 쓰는 페이지가 이미 있어요.');
      const full = { id: uid(), created_at: now(), ...clone(row) };
      table(t).push(full);
      save();
      return clone(full);
    },
    async insertMany(t, rows) {
      const out = [];
      for (const r of rows) out.push(await api.insert(t, r));
      return out;
    },
    async update(t, id, patch) {
      requireEditor();
      const row = table(t).find((r) => r.id === id);
      if (!row) throw new Error('항목을 찾을 수 없어요.');
      if (t === 'pages' && patch.slug !== undefined && table(t).some((p) => p.slug === patch.slug && p.id !== id)) throw new Error('같은 주소(slug)를 쓰는 페이지가 이미 있어요.');
      Object.assign(row, clone(patch), { updated_at: now() });
      save();
      return clone(row);
    },
    async remove(t, id) {
      requireEditor();
      db[t] = table(t).filter((r) => r.id !== id);
      // 데이터베이스의 "함께 삭제(cascade)" 규칙 흉내
      if (t === 'pages') for (const c of ['papers', 'series', 'posts', 'gallery_categories']) db[c] = table(c).filter((r) => r.page_id !== id);
      if (t === 'pages' || t === 'gallery_categories') {
        const cats = new Set(table('gallery_categories').map((c) => c.id));
        db.gallery_images = table('gallery_images').filter((r) => cats.has(r.category_id));
      }
      save();
    },
    async reorder(t, ids) {
      requireEditor();
      ids.forEach((id, i) => {
        const row = table(t).find((r) => r.id === id);
        if (row) row.sort_order = i;
      });
      save();
    },
    async getSettings() {
      return clone(db.settings);
    },
    async saveSettings(data) {
      requireEditor();
      db.settings = clone(data);
      save();
    },
    async upload(file, folder = 'uploads') {
      requireEditor();
      if (file.size > 1.5 * 1024 * 1024) throw new Error('데모 모드에서는 1.5MB 이하 파일만 올릴 수 있어요. (실제 연결 후에는 50MB까지)');
      const url = await fileToDataURL(file);
      return api.insert('media', { path: '', url, name: file.name, size: file.size, mime: file.type, folder });
    },
    async removeMedia(row) {
      await api.remove('media', row.id);
    },
    async removeMediaByUrl(url) {
      for (const r of table('media').filter((m) => m.url === url)) await api.remove('media', r.id);
    },
    async getUser() {
      return db.user;
    },
    onAuthChange(cb) {
      authListeners.add(cb);
    },
    async sendLoginEmail(email) {
      // 데모에서는 메일을 보내지 않고 바로 로그인 처리
      db.user = { id: 'demo', email: email || 'demo@example.com' };
      save();
      authListeners.forEach((cb) => cb(db.user));
      return { instant: true };
    },
    async verifyCode() {},
    async signInWithPassword(email) {
      return api.sendLoginEmail(email);
    },
    async signOut() {
      db.user = null;
      save();
      authListeners.forEach((cb) => cb(null));
    },
    async getRole() {
      return db.user ? 'admin' : 'viewer';
    },
    resetDemo() {
      localStorage.removeItem(KEY);
      db = load();
    },
  };
  return api;
}

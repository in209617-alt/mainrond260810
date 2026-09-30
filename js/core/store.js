// ─────────────────────────────────────────────────────────────
// store.js — 홈페이지 전체가 함께 쓰는 정보(설정·메뉴·로그인 상태)를 보관
// ─────────────────────────────────────────────────────────────
import { deepMerge, clone } from './dom.js';
import { DEFAULT_SETTINGS, buildSeed, OLD_DEFAULT_THEME, OLD_DEFAULT_THEMES } from '../data/seed.js';

const listeners = new Set();

export const store = {
  api: null,
  settings: clone(DEFAULT_SETTINGS),
  settingsSaved: false, // 데이터베이스에 설정이 저장되어 있는지
  pages: [],
  user: null,
  role: 'viewer',
  get canEdit() {
    return this.role === 'admin' || this.role === 'editor';
  },
  get isAdmin() {
    return this.role === 'admin';
  },
};

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function notify(what = 'all') {
  listeners.forEach((fn) => fn(what));
}

export async function initApi() {
  const cfg = window.SITE_CONFIG || {};
  const url = (cfg.SUPABASE_URL || '').trim();
  const key = (cfg.SUPABASE_ANON_KEY || '').trim();
  if (url && key && !url.includes('여기에')) {
    const m = await import('../data/supabase.js');
    store.api = await m.createSupabaseBackend(url, key);
  } else {
    const m = await import('../data/demo.js');
    store.api = m.createDemoBackend();
  }
  return store.api;
}

export async function loadSettings() {
  const saved = await store.api.getSettings();
  store.settingsSaved = !!saved;
  store.settings = deepMerge(clone(DEFAULT_SETTINGS), saved || {});
  // 예전 기본 디자인을 한 번도 바꾸지 않은 사이트는 새 기본 디자인(도트 데스크탑)으로 보여줌
  const t = store.settings.theme;
  const same = (old) => Object.entries(old).every(([k, v]) => String(t[k]).toLowerCase() === v.toLowerCase());
  if ([OLD_DEFAULT_THEME, ...OLD_DEFAULT_THEMES].some(same)) {
    Object.assign(t, { ...DEFAULT_SETTINGS.theme, bgImage: t.bgImage, bgOverlay: t.bgOverlay });
  }
  // 메인 화면 구역 목록에 새로 추가된 구역이 있으면 뒤에 붙여줌
  // (이미 저장된 설정에도 새 구역이 기본 위치에 나타나도록)
  const list = store.settings.home.sections;
  DEFAULT_SETTINGS.home.sections.forEach((s, i) => {
    if (list.some((x) => x.key === s.key)) return;
    const prevKey = DEFAULT_SETTINGS.home.sections.slice(0, i).reverse().find((p) => list.some((x) => x.key === p.key))?.key;
    const at = prevKey ? list.findIndex((x) => x.key === prevKey) + 1 : 0;
    list.splice(at, 0, { ...s });
  });
  notify('settings');
}

export async function saveSettings(next) {
  await store.api.saveSettings(next);
  store.settings = deepMerge(clone(DEFAULT_SETTINGS), next);
  store.settingsSaved = true;
  notify('settings');
}

export async function loadPages() {
  store.pages = await store.api.select('pages');
  notify('pages');
}

export async function refreshAuth(user) {
  store.user = user === undefined ? await store.api.getUser() : user;
  store.role = store.user ? await store.api.getRole() : 'viewer';
  notify('auth');
}

export function findPage(slug) {
  return store.pages.find((p) => (p.slug || '') === (slug || ''));
}
export function homePage() {
  return store.pages.find((p) => p.type === 'home');
}

/** 데이터베이스가 비어 있을 때 기본 콘텐츠를 한 번에 넣기 */
export async function seedDatabase() {
  const api = store.api;
  const seed = buildSeed();
  const existing = await api.select('pages');
  if (existing.length) throw new Error('이미 페이지가 있어요. 기본 콘텐츠는 비어 있을 때만 넣을 수 있습니다.');
  await api.insertMany('pages', seed.pages);
  await api.insertMany('papers', seed.papers);
  await api.insertMany('series', seed.series);
  await api.insertMany('posts', seed.posts);
  await api.insertMany('gallery_categories', seed.gallery_categories);
  if (!store.settingsSaved) await saveSettings(seed.settings);
  await loadPages();
}

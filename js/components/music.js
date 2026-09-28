// ─────────────────────────────────────────────────────────────
// music.js — 음악 재생
//  · 홈페이지 전체에서 음악 하나를 같이 씁니다. (페이지를 옮겨도 계속 재생)
//  · 방문자 누구나 머리글의 [♪ 음악 켜기/끄기] 버튼이나
//    메인 화면 카세트의 버튼으로 음악을 켜고 끌 수 있어요.
//  · 브라우저 정책상 자동재생은 막혀 있어서, 방문자가 직접 눌러야 시작됩니다.
// 지원: mp3 등 오디오 파일 주소 · YouTube · SoundCloud · Spotify 링크
// ─────────────────────────────────────────────────────────────
import { h, safeUrl, fill } from '../core/dom.js';

export function parseMusic(url) {
  const u = safeUrl(url);
  if (!u) return { kind: 'none' };
  let m;
  if ((m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/))) return { kind: 'youtube', id: m[1] };
  if ((m = u.match(/open\.spotify\.com\/(?:intl-\w+\/)?(track|album|playlist|episode)\/(\w+)/))) return { kind: 'spotify', type: m[1], id: m[2] };
  if (/soundcloud\.com\//.test(u)) return { kind: 'soundcloud', url: u };
  if (/^data:audio\//.test(u) || /\.(mp3|ogg|wav|m4a|aac|flac|opus)(\?|$)/i.test(u) || /\/audio\//.test(u)) return { kind: 'audio', url: u };
  return { kind: 'link', url: u };
}

const fmt = (s) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');
const KIND_NAME = { youtube: 'YouTube', spotify: 'Spotify', soundcloud: 'SoundCloud', audio: '음악 파일' };

/* ───────── 홈페이지 전체가 함께 쓰는 음악 조종기 ───────── */
export const music = {
  info: { kind: 'none' },
  track: {},
  playing: false,
  audio: null,
  dock: null,
  listeners: new Set(),

  /** 설정의 음악 정보를 넣기 (주소가 바뀌었을 때만 새로 준비) */
  load(track = {}) {
    const next = parseMusic(track.url);
    const same = JSON.stringify(next) === JSON.stringify(this.info);
    this.track = track;
    if (!same) {
      this.stop();
      this.info = next;
      if (this.audio) {
        this.audio.remove();
        this.audio = null;
      }
    }
    this.emit();
  },
  get canPlay() {
    return ['audio', 'youtube', 'spotify', 'soundcloud'].includes(this.info.kind);
  },
  ensureDock() {
    if (this.dock) return this.dock;
    this.dock = h('div', { class: 'music-dock', hidden: true, 'aria-label': '음악 플레이어' });
    document.body.append(this.dock);
    return this.dock;
  },
  ensureAudio() {
    if (this.audio) return this.audio;
    const a = h('audio', { preload: 'none', src: this.info.url });
    a.addEventListener('play', () => this.set(true));
    a.addEventListener('pause', () => this.set(false));
    a.addEventListener('ended', () => this.set(false));
    a.addEventListener('timeupdate', () => this.emit('time'));
    a.addEventListener('loadedmetadata', () => this.emit('time'));
    a.volume = this.volume;
    document.body.append(a);
    this.audio = a;
    return a;
  },
  volume: 0.8,
  setVolume(v) {
    this.volume = v;
    if (this.audio) this.audio.volume = v;
  },
  play() {
    if (!this.canPlay) return;
    if (this.info.kind === 'audio') {
      this.ensureAudio().play().catch(() => this.set(false));
      return;
    }
    const i = this.info;
    let src;
    if (i.kind === 'youtube') src = `https://www.youtube-nocookie.com/embed/${i.id}?autoplay=1&rel=0&loop=1&playlist=${i.id}`;
    if (i.kind === 'spotify') src = `https://open.spotify.com/embed/${i.type}/${i.id}?utm_source=generator&theme=0`;
    if (i.kind === 'soundcloud') src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(i.url)}&auto_play=true&visual=false&show_comments=false`;
    const dock = this.ensureDock();
    fill(dock,
      h('div', { class: 'dock-head' }, h('span', { class: 'dock-title' }, '♪ ', this.track.title || '음악'), h('button', { class: 'dock-off', onclick: () => this.stop() }, '끄기')),
      h('div', { class: ['dock-frame', 'embed-' + i.kind] }, h('iframe', { src, title: this.track.title || '음악', allow: 'autoplay; encrypted-media; clipboard-write' })));
    dock.hidden = false;
    this.set(true);
  },
  stop() {
    if (this.audio && !this.audio.paused) this.audio.pause();
    if (this.dock) {
      fill(this.dock);
      this.dock.hidden = true;
    }
    this.set(false);
  },
  toggle() {
    this.playing ? this.stop() : this.play();
  },
  set(on) {
    if (this.playing === on) return;
    this.playing = on;
    this.emit();
  },
  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },
  emit(what = 'state') {
    this.listeners.forEach((fn) => fn(what));
  },
};

/** 머리글에 들어가는 작은 [♪ 음악 켜기/끄기] 버튼 — 모든 페이지·모든 방문자 */
export function musicToggleButton() {
  const btn = h('button', { class: 'music-toggle', type: 'button', onclick: () => music.toggle() });
  const paint = () => {
    btn.hidden = !music.canPlay;
    btn.classList.toggle('on', music.playing);
    btn.setAttribute('aria-pressed', String(music.playing));
    btn.title = music.playing ? '음악 끄기' : '음악 켜기';
    fill(btn, h('span', { class: 'mt-icon', 'aria-hidden': 'true' }, music.playing ? '♪' : '♪'), h('span', { class: 'mt-text' }, music.playing ? '음악 끄기' : '음악 켜기'), h('span', { class: 'mt-eq', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')));
  };
  paint();
  const off = music.on((w) => w === 'state' && paint());
  btn._cleanup = off;
  return btn;
}

function reel() {
  return h('span', { class: 'reel' }, h('span', { class: 'reel-hub' }));
}

/** 메인 화면의 카세트테이프 플레이어 */
export function musicPlayer(track) {
  music.load(track);
  const info = music.info;
  const deck = h('div', { class: 'cassette' },
    h('div', { class: 'cassette-label' },
      h('span', { class: 'cassette-side' }, 'A'),
      h('span', { class: 'cassette-title' }, track.title || '제목 없음'),
      h('span', { class: 'cassette-artist' }, track.artist || '')),
    h('div', { class: 'cassette-window' }, reel(), h('span', { class: 'cassette-tape' }), reel()),
    h('div', { class: 'cassette-bottom' }, h('span'), h('span'), h('span'), h('span')));

  const wrap = h('div', { class: 'music' }, deck);

  if (info.kind === 'none') {
    wrap.append(h('p', { class: 'music-empty' }, '관리자 페이지 → 메인 화면 → 음악에서 링크를 넣어주세요.'));
    return wrap;
  }
  if (info.kind === 'link') {
    wrap.append(h('div', { class: 'music-controls' }, h('a', { class: 'btn btn-sm', href: info.url, target: '_blank', rel: 'noopener' }, '♪ 음악 들으러 가기')));
    return wrap;
  }

  // 켜기/끄기 버튼 (누구나 사용 가능)
  const power = h('button', { class: 'music-power', type: 'button', onclick: () => music.toggle() });
  const status = h('span', { class: 'music-time' });
  const controls = h('div', { class: 'music-controls' }, power, status);
  wrap.append(controls);

  let bar;
  let vol;
  if (info.kind === 'audio') {
    bar = h('input', { type: 'range', class: 'music-bar', min: 0, max: 1000, value: 0, 'aria-label': '재생 위치' });
    bar.addEventListener('input', () => {
      const a = music.ensureAudio();
      if (a.duration) a.currentTime = (bar.value / 1000) * a.duration;
    });
    vol = h('input', { type: 'range', class: 'music-vol', min: 0, max: 1, step: 0.05, value: music.volume, 'aria-label': '음량' });
    vol.addEventListener('input', () => music.setVolume(Number(vol.value)));
    wrap.append(h('div', { class: 'music-controls music-sub' }, bar, h('span', { class: 'music-vol-label', 'aria-hidden': 'true' }, '🔈'), vol));
  }

  const paint = (what) => {
    const a = music.audio;
    if (what === 'time') {
      if (a && bar) {
        if (a.duration) bar.value = (a.currentTime / a.duration) * 1000;
        status.textContent = `${fmt(a.currentTime)} / ${fmt(a.duration)}`;
      }
      return;
    }
    wrap.classList.toggle('playing', music.playing);
    power.classList.toggle('on', music.playing);
    power.setAttribute('aria-pressed', String(music.playing));
    fill(power, h('span', { class: 'power-dot', 'aria-hidden': 'true' }), music.playing ? '음악 끄기' : '음악 켜기');
    if (info.kind !== 'audio') status.textContent = music.playing ? `${KIND_NAME[info.kind]} 재생 중 · 화면 왼쪽 아래 플레이어` : `${KIND_NAME[info.kind]}`;
    else if (!a) status.textContent = '0:00';
  };
  paint('state');
  paint('time');
  wrap._cleanup = music.on(paint);
  return wrap;
}

// ─────────────────────────────────────────────────────────────
// music.js — 카세트테이프 모양 음악 플레이어
// 브라우저 정책상 자동재생은 막히므로, 방문자가 ▶ 버튼을 눌러 재생합니다.
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

function reel() {
  return h('span', { class: 'reel' }, h('span', { class: 'reel-hub' }));
}

const fmt = (s) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');

export function musicPlayer(music) {
  const info = parseMusic(music.url);
  const deck = h('div', { class: 'cassette' },
    h('div', { class: 'cassette-label' },
      h('span', { class: 'cassette-side' }, 'A'),
      h('span', { class: 'cassette-title' }, music.title || '제목 없음'),
      h('span', { class: 'cassette-artist' }, music.artist || '')),
    h('div', { class: 'cassette-window' }, reel(), h('span', { class: 'cassette-tape' }), reel()),
    h('div', { class: 'cassette-bottom' }, h('span'), h('span'), h('span'), h('span')));

  const wrap = h('div', { class: 'music' }, deck);
  const setPlaying = (on) => wrap.classList.toggle('playing', on);

  if (info.kind === 'none') {
    wrap.append(h('p', { class: 'music-empty' }, '관리자 페이지 → 메인 화면 → 음악에서 링크를 넣어주세요.'));
    return wrap;
  }

  if (info.kind === 'audio') {
    const audio = h('audio', { preload: 'none', src: info.url });
    const bar = h('input', { type: 'range', class: 'music-bar', min: 0, max: 1000, value: 0, 'aria-label': '재생 위치' });
    const time = h('span', { class: 'music-time' }, '0:00');
    const btn = h('button', { class: 'music-btn', 'aria-label': '재생' }, '▶');
    btn.addEventListener('click', () => (audio.paused ? audio.play().catch(() => {}) : audio.pause()));
    audio.addEventListener('play', () => { setPlaying(true); btn.textContent = '❚❚'; btn.setAttribute('aria-label', '일시정지'); });
    audio.addEventListener('pause', () => { setPlaying(false); btn.textContent = '▶'; btn.setAttribute('aria-label', '재생'); });
    audio.addEventListener('timeupdate', () => {
      if (audio.duration) bar.value = (audio.currentTime / audio.duration) * 1000;
      time.textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
    });
    bar.addEventListener('input', () => audio.duration && (audio.currentTime = (bar.value / 1000) * audio.duration));
    wrap.append(h('div', { class: 'music-controls' }, btn, bar, time), audio);
    wrap._stop = () => audio.pause();
    return wrap;
  }

  if (info.kind === 'link') {
    wrap.append(h('div', { class: 'music-controls' }, h('a', { class: 'btn btn-sm', href: info.url, target: '_blank', rel: 'noopener' }, '♪ 음악 들으러 가기')));
    return wrap;
  }

  // YouTube / Spotify / SoundCloud: 재생 버튼을 누르면 플레이어를 불러옴
  const frameBox = h('div', { class: ['music-embed', 'embed-' + info.kind] });
  const btn = h('button', { class: 'music-btn', 'aria-label': '재생' }, '▶');
  let loaded = false;
  btn.addEventListener('click', () => {
    if (loaded) {
      fill(frameBox);
      loaded = false;
      setPlaying(false);
      btn.textContent = '▶';
      return;
    }
    let src;
    if (info.kind === 'youtube') src = `https://www.youtube-nocookie.com/embed/${info.id}?autoplay=1&rel=0`;
    if (info.kind === 'spotify') src = `https://open.spotify.com/embed/${info.type}/${info.id}?utm_source=generator&theme=0`;
    if (info.kind === 'soundcloud') src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(info.url)}&auto_play=true&visual=false&show_comments=false`;
    fill(frameBox, h('iframe', { src, title: music.title || '음악', allow: 'autoplay; encrypted-media; clipboard-write', loading: 'lazy' }));
    loaded = true;
    setPlaying(true);
    btn.textContent = '■';
  });
  wrap.append(h('div', { class: 'music-controls' }, btn, h('span', { class: 'music-time' }, { youtube: 'YouTube', spotify: 'Spotify', soundcloud: 'SoundCloud' }[info.kind] + ' 재생')), frameBox);
  return wrap;
}

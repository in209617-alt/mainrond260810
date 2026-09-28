// ─────────────────────────────────────────────────────────────
// stage.js — 메인 화면의 "캐릭터 공간"
// 두 캐릭터가 알아서 상하좌우로 걸어 다니고, 가까워지면 콩콩 뛰며 하트가 나옵니다.
// 방문자가 조작하는 게임 요소는 없습니다. (보기 전용 장식)
// 모든 이미지 주소는 관리자 페이지 → 메인 화면 → 캐릭터 공간에서 바꿀 수 있어요.
// ─────────────────────────────────────────────────────────────
import { safeUrl } from '../core/dom.js';

const T = 16; // 타일 한 칸 크기(px)

function loadImage(src) {
  return new Promise((resolve) => {
    const url = safeUrl(src);
    if (!url) return resolve(null);
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = url;
  });
}
const loadAll = (list = []) => Promise.all(list.map(loadImage)).then((a) => a.filter(Boolean));

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

// 기본 하트 (7×6 도트)
const HEART = ['.XX.XX.', 'XWXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
function drawPixelHeart(ctx, x, y, alpha, s = 1) {
  ctx.globalAlpha = alpha;
  HEART.forEach((row, j) =>
    [...row].forEach((c, i) => {
      if (c === '.') return;
      ctx.fillStyle = c === 'W' ? '#ffd9d2' : '#d4483d';
      ctx.fillRect(Math.round(x + i * s), Math.round(y + j * s), s, s);
    })
  );
  ctx.globalAlpha = 1;
}

export async function createStage(host, cfg) {
  const canvas = document.createElement('canvas');
  canvas.className = 'stage-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '두 캐릭터가 숲길을 산책하는 장면');
  host.append(canvas);
  const ctx = canvas.getContext('2d');

  const [ground, groundDark, path, trees, smalls, decor, leaves, shadowArr, heartArr, sheets] = await Promise.all([
    loadAll(cfg.ground), loadAll(cfg.groundDark), loadAll(cfg.path), loadAll(cfg.trees), loadAll(cfg.smalls),
    loadAll(cfg.decor), loadAll(cfg.leaves), loadAll([cfg.shadow]), loadAll([cfg.heart]),
    Promise.all((cfg.chars || []).slice(0, 2).map((c) => loadImage(c.sheet))),
  ]);
  const shadow = shadowArr[0];
  const heartImg = heartArr[0];

  let cols = 0;
  let rows = Math.max(7, Math.min(20, Number(cfg.height) || 11));
  let W = 0;
  let H = 0;
  let groundLayer = null;
  let props = []; // 나무·덤불 등 (앞뒤 순서 정렬 대상)
  let blocks = []; // 부딪히는 영역
  let topLimit = 0;

  function buildMap() {
    const width = host.clientWidth || 800;
    const scale = width >= 980 ? 3 : width >= 520 ? 2 : 2;
    cols = Math.max(12, Math.ceil(width / (T * scale)));
    W = cols * T;
    H = rows * T;
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = W * scale + 'px';
    canvas.style.height = H * scale + 'px';
    const r = rng(20260810);

    // 1) 바닥(잔디/길/꽃)을 미리 한 장으로 그려둠
    groundLayer = document.createElement('canvas');
    groundLayer.width = W;
    groundLayer.height = H;
    const g = groundLayer.getContext('2d');
    g.imageSmoothingEnabled = false;
    const pathRow = Math.floor(rows * 0.62);
    const pathCol = Math.floor(cols * 0.3);
    const darkSeeds = Array.from({ length: Math.ceil(cols / 6) }, () => [r() * cols, r() * rows, 1.5 + r() * 2.5]);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const onPath = (y === pathRow) || (x === pathCol && y > pathRow);
        let tile;
        if (onPath && path.length) tile = pick(r, path);
        else if (groundDark.length && darkSeeds.some(([cx, cy, rad]) => Math.hypot(x - cx, y - cy) < rad)) tile = pick(r, groundDark);
        else if (ground.length) tile = r() < 0.55 ? ground[0] : pick(r, ground);
        if (tile) g.drawImage(tile, x * T, y * T, T, T);
        else {
          g.fillStyle = onPath ? '#a07a4f' : '#7aa05a';
          g.fillRect(x * T, y * T, T, T);
        }
        if (!onPath && decor.length && y > 1 && r() < 0.07) g.drawImage(pick(r, decor), x * T, y * T);
      }
    }

    // 2) 위쪽 가장자리를 따라 나무, 곳곳에 덤불·바위
    props = [];
    blocks = [];
    topLimit = T * 2.6;
    if (trees.length) {
      for (let x = -8; x < W + 8; x += 26 + r() * 22) {
        const im = pick(r, trees);
        const baseY = T * 1.6 + r() * T * 0.8;
        props.push({ im, x: Math.round(x), y: Math.round(baseY) });
        blocks.push({ x: x - 6, y: baseY - 6, w: 12, h: 8 });
      }
    }
    const n = Math.round(cols / 5);
    for (let i = 0; i < n && smalls.length; i++) {
      const x = 20 + r() * (W - 40);
      const y = topLimit + 20 + r() * (H - topLimit - 30);
      if (Math.abs(y - (pathRow * T + 8)) < 16 || Math.abs(x - (pathCol * T + 8)) < 14) continue;
      const im = pick(r, smalls);
      props.push({ im, x: Math.round(x), y: Math.round(y) });
      blocks.push({ x: x - im.width / 2 + 1, y: y - 5, w: im.width - 2, h: 6 });
    }
  }

  // 캐릭터
  const chars = (cfg.chars || []).slice(0, 2).map((c, i) => ({
    sheet: sheets[i],
    fw: Number(c.fw) || 16,
    fh: Number(c.fh) || 24,
    frames: Number(c.frames) || 4,
    order: String(c.order || 'down,up,left,right').split(',').map((s) => s.trim()),
    x: 0,
    y: 0,
    dir: i === 0 ? 'right' : 'left',
    state: 'idle',
    timer: 0.5 + i,
    anim: 0,
    hop: 0,
    placed: false,
  }));
  const speed = 20 * (Number(cfg.speed) || 1);
  const hearts = [];
  const falling = [];
  let meetCooldown = 3;

  function placeChars() {
    chars.forEach((c, i) => {
      if (!c.placed || c.x > W - 8) {
        c.x = W * (i === 0 ? 0.35 : 0.62);
        c.y = topLimit + (H - topLimit) * 0.55;
        c.placed = true;
      }
      c.y = Math.min(c.y, H - 4);
    });
  }

  const blocked = (x, y) => x < 8 || x > W - 8 || y < topLimit || y > H - 3 || blocks.some((b) => x > b.x - 4 && x < b.x + b.w + 4 && y > b.y - 2 && y < b.y + b.h + 2);
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  function think(c, other, r = Math.random()) {
    if (r < 0.22) {
      c.state = 'idle';
      c.timer = 0.8 + Math.random() * 1.8;
      return;
    }
    c.state = 'walk';
    c.timer = 0.7 + Math.random() * 2;
    if (other && r < 0.58) {
      const dx = other.x - c.x;
      const dy = other.y - c.y;
      c.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    } else c.dir = pick(Math.random, Object.keys(DIRS));
  }

  function update(dt) {
    meetCooldown -= dt;
    chars.forEach((c, i) => {
      const other = chars[1 - i];
      c.timer -= dt;
      if (c.state === 'hop') {
        c.hop += dt;
        if (c.timer <= 0) {
          c.state = 'walk';
          c.hop = 0;
          c.timer = 1.2;
          c.dir = { left: 'right', right: 'left', up: 'down', down: 'up' }[c.dir];
        }
        return;
      }
      if (c.timer <= 0) think(c, other);
      if (c.state === 'walk') {
        const [vx, vy] = DIRS[c.dir];
        const nx = c.x + vx * speed * dt;
        const ny = c.y + vy * speed * dt;
        if (blocked(nx, ny) && !blocked(c.x, c.y)) think(c, null, 0.5);
        else {
          c.x = nx;
          c.y = ny;
        }
        c.anim += dt * 7;
      } else c.anim = 0;
    });

    // 두 캐릭터가 가까워지면 → 서로 바라보고 콩콩 + 하트
    if (chars.length === 2 && meetCooldown <= 0) {
      const [a, b] = chars;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (Math.hypot(dx, dy) < 22) {
        meetCooldown = 8;
        const horiz = Math.abs(dx) >= Math.abs(dy);
        a.dir = horiz ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        b.dir = horiz ? (dx > 0 ? 'left' : 'right') : dy > 0 ? 'up' : 'down';
        [a, b].forEach((c) => { c.state = 'hop'; c.timer = 1.3; c.hop = 0; c.anim = 0; });
        const mx = (a.x + b.x) / 2;
        const my = Math.min(a.y, b.y) - 26;
        hearts.push({ x: mx, y: my, vy: -8, life: 1.8, max: 1.8, s: 2 });
        for (let k = 0; k < 3; k++) hearts.push({ x: mx + (Math.random() - 0.5) * 22, y: my + 6, vy: -10 - Math.random() * 8, life: 1.2 + Math.random() * 0.6, max: 1.8, s: 1, delay: 0.15 * (k + 1) });
      }
    }
    for (let i = hearts.length - 1; i >= 0; i--) {
      const p = hearts[i];
      if (p.delay > 0) { p.delay -= dt; continue; }
      p.life -= dt;
      p.y += p.vy * dt;
      p.x += Math.sin(p.life * 6) * 4 * dt;
      if (p.life <= 0) hearts.splice(i, 1);
    }
    // 가끔 떨어지는 나뭇잎
    if (leaves.length && Math.random() < dt * 0.6) falling.push({ im: pick(Math.random, leaves), x: Math.random() * W, y: -2, vx: 4 + Math.random() * 6, vy: 10 + Math.random() * 8, t: Math.random() * 6 });
    for (let i = falling.length - 1; i >= 0; i--) {
      const l = falling[i];
      l.t += dt;
      l.x += (l.vx + Math.sin(l.t * 2) * 8) * dt;
      l.y += l.vy * dt;
      if (l.y > H + 4 || l.x > W + 4) falling.splice(i, 1);
    }
  }

  function draw() {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(groundLayer, 0, 0);
    const list = [
      ...props.map((p) => ({ y: p.y, draw: () => ctx.drawImage(p.im, Math.round(p.x - p.im.width / 2), Math.round(p.y - p.im.height + 2)) })),
      ...chars.map((c) => ({
        y: c.y,
        draw: () => {
          const hopY = c.state === 'hop' ? Math.abs(Math.sin((c.hop / 0.42) * Math.PI)) * 6 : 0;
          if (shadow) ctx.drawImage(shadow, Math.round(c.x - 7), Math.round(c.y - 3), 14, 4);
          else {
            ctx.fillStyle = 'rgba(0,0,0,.2)';
            ctx.fillRect(Math.round(c.x - 6), Math.round(c.y - 2), 12, 3);
          }
          const row = Math.max(0, c.order.indexOf(c.dir));
          const frame = c.state === 'walk' ? Math.floor(c.anim) % c.frames : 0;
          const dx = Math.round(c.x - c.fw / 2);
          const dy = Math.round(c.y - c.fh + 1 - hopY);
          if (c.sheet) ctx.drawImage(c.sheet, frame * c.fw, row * c.fh, c.fw, c.fh, dx, dy, c.fw, c.fh);
          else {
            ctx.fillStyle = '#2b261f';
            ctx.fillRect(dx + 3, dy + 6, c.fw - 6, c.fh - 6);
          }
        },
      })),
    ].sort((a, b) => a.y - b.y);
    list.forEach((d) => d.draw());
    falling.forEach((l) => ctx.drawImage(l.im, Math.round(l.x), Math.round(l.y)));
    hearts.forEach((p) => {
      if (p.delay > 0) return;
      const a = Math.min(1, p.life / 0.5);
      if (heartImg) {
        ctx.globalAlpha = a;
        const w = 7 * p.s + 2;
        ctx.drawImage(heartImg, Math.round(p.x - w / 2), Math.round(p.y), w, Math.round((w * heartImg.height) / heartImg.width));
        ctx.globalAlpha = 1;
      } else drawPixelHeart(ctx, p.x - (7 * p.s) / 2, p.y, a, p.s);
    });
  }

  buildMap();
  placeChars();

  let running = false;
  let visible = true;
  let last = 0;
  let raf = 0;
  const loop = (t) => {
    if (!running) return;
    const dt = Math.min(0.05, (t - last) / 1000 || 0);
    last = t;
    update(dt);
    draw();
    raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (running || !visible || document.hidden) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  };
  const pause = () => {
    running = false;
    cancelAnimationFrame(raf);
  };
  draw();
  start();

  // 화면에서 안 보일 땐 멈춰서 배터리 절약
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : pause(); });
  io.observe(host);
  const onVis = () => (document.hidden ? pause() : start());
  document.addEventListener('visibilitychange', onVis);
  let lastWidth = host.clientWidth;
  const ro = new ResizeObserver(() => {
    if (Math.abs(host.clientWidth - lastWidth) < 8) return;
    lastWidth = host.clientWidth;
    buildMap();
    placeChars();
    draw();
  });
  ro.observe(host);

  return () => {
    pause();
    io.disconnect();
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVis);
  };
}

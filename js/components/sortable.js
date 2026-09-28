// ─────────────────────────────────────────────────────────────
// sortable.js — 마우스/손가락으로 끌어서(Drag & Drop) 순서 바꾸기
// 사용법: makeSortable(목록요소, { onEnd: (새 순서의 id 배열) => 저장 })
// 각 항목에는 data-id 와 손잡이(.drag-handle)가 있어야 합니다.
// ─────────────────────────────────────────────────────────────

export function makeSortable(container, { item = '.sort-item', handle = '.drag-handle', onEnd } = {}) {
  let dragging = null;
  let offX = 0;
  let offY = 0;
  let startOrder = '';
  let lastX = 0;
  let lastY = 0;
  let scrollTimer = null;

  const ids = () => [...container.querySelectorAll(':scope > ' + item)].map((el) => el.dataset.id);

  const place = () => {
    if (!dragging) return;
    dragging.style.transform = 'none';
    const r = dragging.getBoundingClientRect();
    dragging.style.transform = `translate(${lastX - offX - r.left}px, ${lastY - offY - r.top}px)`;
  };

  const onMove = (e) => {
    if (!dragging) return;
    e.preventDefault();
    lastX = e.clientX;
    lastY = e.clientY;
    const under = document.elementFromPoint(lastX, lastY);
    const target = under?.closest(item);
    if (target && target !== dragging && target.parentElement === container) {
      const all = [...container.children];
      if (all.indexOf(target) > all.indexOf(dragging)) target.after(dragging);
      else target.before(dragging);
    }
    place();
    // 화면 가장자리 근처면 자동 스크롤
    clearInterval(scrollTimer);
    const edge = 60;
    const dir = lastY < edge ? -1 : lastY > innerHeight - edge ? 1 : 0;
    if (dir) {
      scrollTimer = setInterval(() => {
        scrollBy(0, dir * 12);
        place();
      }, 16);
    }
  };

  const onUp = () => {
    if (!dragging) return;
    clearInterval(scrollTimer);
    dragging.classList.remove('dragging');
    dragging.style.transform = '';
    dragging.style.pointerEvents = '';
    dragging = null;
    container.classList.remove('is-sorting');
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
    const order = ids();
    if (order.join() !== startOrder) onEnd?.(order);
  };

  container.addEventListener('pointerdown', (e) => {
    const h = e.target.closest(handle);
    if (!h || !container.contains(h)) return;
    const el = h.closest(item);
    if (!el || el.parentElement !== container) return;
    e.preventDefault();
    dragging = el;
    startOrder = ids().join();
    const r = el.getBoundingClientRect();
    offX = e.clientX - r.left;
    offY = e.clientY - r.top;
    lastX = e.clientX;
    lastY = e.clientY;
    el.classList.add('dragging');
    el.style.pointerEvents = 'none';
    container.classList.add('is-sorting');
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  });

  /** 버튼으로 한 칸 올리기/내리기 (키보드·모바일용) */
  return {
    move(el, delta) {
      const all = [...container.querySelectorAll(':scope > ' + item)];
      const i = all.indexOf(el);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= all.length) return;
      if (delta < 0) all[j].before(el);
      else all[j].after(el);
      onEnd?.(ids());
    },
  };
}

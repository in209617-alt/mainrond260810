// ─────────────────────────────────────────────────────────────
// image.js — 업로드 전에 너무 큰 사진을 알맞은 크기로 줄여서
// 무료 저장 공간(1GB)을 아껴 쓰도록 도와줍니다.
// 도트(픽셀) 그림, GIF, SVG, 작은 PNG는 화질 보호를 위해 그대로 올립니다.
// ─────────────────────────────────────────────────────────────

const MAX_SIDE = 2400;

export async function prepareImage(file, { raw = false } = {}) {
  if (!file.type.startsWith('image/')) return file;
  if (raw) return file;
  if (/image\/(gif|svg\+xml)/.test(file.type)) return file;
  if (file.type === 'image/png' && file.size < 400 * 1024) return file; // 작은 PNG(도트 등)는 그대로
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
  const w = Math.round(bitmap.width * scale);
  const hgt = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = hgt;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, hgt);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', 0.88));
  if (!blob || blob.size >= file.size) return file;
  const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
  return new File([blob], name, { type: 'image/webp' });
}

export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function formatBytes(n) {
  if (!n && n !== 0) return '';
  if (n < 1024) return n + 'B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + 'KB';
  return (n / 1024 / 1024).toFixed(1) + 'MB';
}

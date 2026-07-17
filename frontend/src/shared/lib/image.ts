import { API_URL } from '../config';

/** URL фото товара (публичный эндпоинт; rev — сброс кэша) */
export const productPhotoUrl = (productId: string, rev: number): string =>
  `${API_URL}/products/${productId}/photo?v=${rev}`;

const MAX_SIDE = 900;
const QUALITY = 0.82;

/**
 * Сжимает выбранное фото на клиенте: ресайз до 900px по большей стороне, JPEG.
 * Возвращает data-URL для отправки на сервер.
 */
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas'));
        return;
      }
      // белый фон — PNG с прозрачностью корректно уходит в JPEG
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image'));
    };
    img.src = url;
  });
}

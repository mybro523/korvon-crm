import { productPhotoUrl } from '../lib/image';
import { Icon } from './Icon';

interface ThumbProps {
  productId: string;
  hasPhoto: boolean;
  photoRev: number;
  size?: number;
}

/** миниатюра товара; без фото — иконка-заглушка */
export function Thumb({ productId, hasPhoto, photoRev, size = 42 }: ThumbProps) {
  if (!hasPhoto) {
    return (
      <span className="thumb thumb-empty" style={{ width: size, height: size }}>
        <Icon name="box" size={Math.round(size * 0.5)} />
      </span>
    );
  }
  return (
    <img
      className="thumb"
      style={{ width: size, height: size }}
      src={productPhotoUrl(productId, photoRev)}
      alt=""
      loading="lazy"
    />
  );
}

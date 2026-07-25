import { IconType } from 'react-icons';
import {
  TbAlertTriangle,
  TbArrowsExchange,
  TbBell,
  TbBrandTelegram,
  TbBuildingStore,
  TbCash,
  TbChartHistogram,
  TbCheck,
  TbChevronLeft,
  TbChevronRight,
  TbCreditCard,
  TbDownload,
  TbEye,
  TbEyeOff,
  TbInfoCircle,
  TbLayoutGrid,
  TbLogout,
  TbPackage,
  TbPencil,
  TbPlus,
  TbReceipt,
  TbSearch,
  TbSend,
  TbSettings,
  TbTrash,
  TbUsers,
  TbWallet,
  TbX,
} from 'react-icons/tb';

const ICONS: Record<string, IconType> = {
  chart: TbChartHistogram,
  box: TbPackage,
  store: TbBuildingStore,
  cart: TbReceipt,
  plus: TbPlus,
  users: TbUsers,
  bell: TbBell,
  settings: TbSettings,
  logout: TbLogout,
  search: TbSearch,
  x: TbX,
  trash: TbTrash,
  edit: TbPencil,
  download: TbDownload,
  send: TbSend,
  check: TbCheck,
  left: TbChevronLeft,
  right: TbChevronRight,
  transfer: TbArrowsExchange,
  eye: TbEye,
  'eye-off': TbEyeOff,
  alert: TbAlertTriangle,
  cash: TbCash,
  card: TbCreditCard,
  menu: TbLayoutGrid,
  telegram: TbBrandTelegram,
  info: TbInfoCircle,
  expense: TbWallet,
};

interface IconProps {
  name: keyof typeof ICONS | string;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 18, className }: IconProps) {
  const Cmp = ICONS[name] ?? TbInfoCircle;
  return <Cmp size={size} className={`icon ${className ?? ''}`} aria-hidden="true" />;
}

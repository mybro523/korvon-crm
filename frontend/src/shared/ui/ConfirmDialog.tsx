import { useT } from '../i18n';
import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({ title, message, onConfirm, onCancel, loading }: ConfirmDialogProps) {
  const t = useT();
  return (
    <Modal title={title} onClose={onCancel} width={420}>
      <p style={{ margin: '0 0 18px', color: 'var(--ink-2)' }}>{message}</p>
      <div className="modal-footer">
        <Button variant="secondary" onClick={onCancel}>
          {t.common.cancel}
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {t.common.delete}
        </Button>
      </div>
    </Modal>
  );
}

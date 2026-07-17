import { FormEvent, useState } from 'react';
import { pointsApi } from '@/entities/point/api';
import { SalesPoint } from '@/entities/point/types';
import { extractError } from '@/shared/api/http';
import { useT } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { useToast } from '@/shared/ui/Toast';

interface Props {
  point: SalesPoint | null;
  onClose: () => void;
  onSaved: () => void;
}

export function PointFormModal({ point, onClose, onSaved }: Props) {
  const t = useT();
  const toast = useToast();
  const [name, setName] = useState(point?.name ?? '');
  const [address, setAddress] = useState(point?.address ?? '');
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (point) {
        await pointsApi.update(point.id, { name: name.trim(), address: address.trim() });
      } else {
        await pointsApi.create({ name: name.trim(), address: address.trim() });
      }
      toast.success(t.common.saved);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={point ? t.points.editPoint : t.points.addPoint} onClose={onClose} width={440}>
      <form onSubmit={onSubmit}>
        <Input
          label={t.points.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.points.namePlaceholder}
          required
          autoFocus
        />
        <Input
          label={t.points.address}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={t.points.addressPlaceholder}
        />
        <div className="modal-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" loading={saving}>
            {t.common.save}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

import { FormEvent, useState } from 'react';
import { expensesApi } from '@/entities/expense/api';
import { Expense } from '@/entities/expense/types';
import { extractError } from '@/shared/api/http';
import { useT } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { useToast } from '@/shared/ui/Toast';

interface Props {
  onClose: () => void;
  /** оптимистично добавить расход в список (до ответа сервера) */
  onAdd: (temp: Expense) => void;
  /** сервер подтвердил сохранение — родитель синхронизирует список */
  onSaved: () => void;
  /** откат при ошибке (по временному id) */
  onError: (tempId: string) => void;
  /** имя текущего пользователя — для мгновенного показа «кто добавил» */
  authorName: string;
}

/** форма добавления расхода: сумма + комментарий (дата/время ставит сервер) */
export function ExpenseModal({ onClose, onAdd, onSaved, onError, authorName }: Props) {
  const t = useT();
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');

  const amountNum = parseFloat(amount) || 0;
  const valid = amountNum > 0 && comment.trim().length > 0;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const tempId = `temp-${Date.now()}`;
    const temp: Expense = {
      id: tempId,
      amount: amountNum,
      comment: comment.trim(),
      createdById: null,
      createdByName: authorName,
      createdAt: new Date().toISOString(),
    };
    // оптимистично: модалка закрывается сразу, запись появляется в списке мгновенно
    onClose();
    onAdd(temp);
    expensesApi
      .create({ amount: amountNum, comment: comment.trim() })
      .then(() => {
        onSaved(); // рефетч списка — сходимся к серверной сортировке/странице
        toast.success(t.common.saved);
      })
      .catch((err) => {
        onError(tempId); // убираем временную запись
        toast.error(extractError(err));
      });
  };

  return (
    <Modal title={t.expenses.add} onClose={onClose} width={440}>
      <form onSubmit={onSubmit}>
        <Input
          label={`${t.expenses.amount} (${t.common.somoni})`}
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={t.expenses.amountPlaceholder}
          required
          autoFocus
        />
        <div className="field">
          <label className="field-label">{t.expenses.comment}</label>
          <textarea
            className="field-input"
            style={{ height: 'auto', minHeight: 80, padding: '10px 12px', resize: 'vertical' }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t.expenses.commentPlaceholder}
            maxLength={500}
            required
          />
        </div>
        <div className="modal-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" disabled={!valid}>
            {t.common.save}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

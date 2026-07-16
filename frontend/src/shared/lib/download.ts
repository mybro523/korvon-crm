import axios from 'axios';
import { http } from '../api/http';

/** скачивает файл с авторизацией (Bearer) через blob */
export async function downloadFile(path: string, filename: string): Promise<void> {
  try {
    const res = await http.get(path, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    // ошибка приходит blob-ом — распаковываем JSON, чтобы extractError показал текст
    if (axios.isAxiosError(e) && e.response && e.response.data instanceof Blob) {
      try {
        e.response.data = JSON.parse(await e.response.data.text());
      } catch {
        /* не JSON — оставляем как есть */
      }
    }
    throw e;
  }
}

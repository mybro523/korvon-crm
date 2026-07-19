import { useEffect, useRef, useState } from 'react';

/**
 * Лёгкий клиентский кэш со stale-while-revalidate — без сторонних библиотек.
 * При повторном заходе на страницу данные показываются мгновенно из кэша,
 * а свежие подгружаются в фоне. Поддерживает оптимистичные мутации с защитой
 * от гонок: фоновый ответ не затирает оптимистичное изменение и не «отменяет»
 * более свежий запрос.
 */
interface Entry<T = unknown> {
  data: T | undefined;
  ts: number;
}

const store = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();
/** версия мутаций ключа — растёт при каждой оптимистичной мутации/инвалидации */
const mutationVersion = new Map<string, number>();
/** последний выданный id фонового запроса на ключ (latest-wins) */
const fetchSeq = new Map<string, number>();

function emit(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

function subscribe(key: string, fn: () => void): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(fn);
  return () => set!.delete(fn);
}

const bumpMutation = (key: string) =>
  mutationVersion.set(key, (mutationVersion.get(key) ?? 0) + 1);

export function getCache<T>(key: string): T | undefined {
  return store.get(key)?.data as T | undefined;
}

/** тихо записать значение (из фоновой ревалидации) без бампа версии мутаций */
export function setCache<T>(key: string, data: T): void {
  store.set(key, { data, ts: Date.now() });
  emit(key);
}

/** оптимистично обновить кэш; бампит версию, чтобы устаревший фоновый ответ не затёр изменение */
export function mutateCache<T>(key: string, updater: (prev: T | undefined) => T): T | undefined {
  const prev = store.get(key)?.data as T | undefined;
  bumpMutation(key);
  store.set(key, { data: updater(prev), ts: Date.now() });
  emit(key);
  return prev;
}

/** сбросить кэш ключа (форсирует перезагрузку) */
export function invalidateCache(key: string): void {
  bumpMutation(key);
  store.delete(key);
  emit(key);
}

/** инвалидировать все ключи с префиксом (например, все страницы 'products:') */
export function invalidateByPrefix(prefix: string): void {
  for (const k of Array.from(store.keys())) {
    if (k.startsWith(prefix)) invalidateCache(k);
  }
}

interface QueryResult<T> {
  data: T | undefined;
  loading: boolean;
  refreshing: boolean;
  error: unknown;
  refetch: () => void;
  mutate: (updater: (prev: T | undefined) => T) => T | undefined;
}

export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts: { enabled?: boolean } = {},
): QueryResult<T> {
  const enabled = opts.enabled !== false;
  const [, forceRender] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // ре-рендер при изменении кэша этого ключа (в т.ч. из оптимистичных мутаций)
  useEffect(() => subscribe(key, () => forceRender((n) => n + 1)), [key]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const attempt = () => {
      const myId = (fetchSeq.get(key) ?? 0) + 1;
      fetchSeq.set(key, myId);
      const versionAtStart = mutationVersion.get(key) ?? 0;
      setError(null);
      setRefreshing(true);
      fetcherRef.current()
        .then((data) => {
          if (cancelled || fetchSeq.get(key) !== myId) return; // есть более свежий запрос
          if ((mutationVersion.get(key) ?? 0) === versionAtStart) {
            setCache(key, data);
            setError(null);
          } else {
            // во время запроса была оптимистичная мутация — ответ устарел;
            // не затираем её, а перезапрашиваем свежие данные
            attempt();
            return;
          }
        })
        .catch((e) => {
          if (!cancelled && fetchSeq.get(key) === myId) setError(e);
        })
        .finally(() => {
          if (!cancelled && fetchSeq.get(key) === myId) setRefreshing(false);
        });
    };

    attempt();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  const data = getCache<T>(key);
  return {
    data,
    // loading не зависит от post-paint эффекта — истинно на первом кадре без кэша
    loading: enabled && data === undefined && error == null,
    refreshing,
    error,
    refetch: () => {
      const run = () => {
        const myId = (fetchSeq.get(key) ?? 0) + 1;
        fetchSeq.set(key, myId);
        const versionAtStart = mutationVersion.get(key) ?? 0;
        setRefreshing(true);
        fetcherRef
          .current()
          .then((d) => {
            if (fetchSeq.get(key) !== myId) return;
            if ((mutationVersion.get(key) ?? 0) === versionAtStart) setCache(key, d);
            else run(); // ответ устарел из-за мутации — перезапрашиваем
          })
          .catch(() => {})
          .finally(() => {
            if (fetchSeq.get(key) === myId) setRefreshing(false);
          });
      };
      run();
    },
    mutate: (updater) => mutateCache<T>(key, updater),
  };
}

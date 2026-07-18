/** Предустановленные категории одежды (магазин). Можно дополнять своими. */
export const CLOTHING_CATEGORIES = [
  'Рубашка',
  'Сарафан',
  'Костюм-брюки (комплект)',
  'Брюки',
  'Пиджак',
  'Майка',
];

/** объединяет предустановленные категории с реально существующими (без дублей) */
export function mergeCategories(existing: string[]): string[] {
  const set = new Set<string>(CLOTHING_CATEGORIES);
  for (const c of existing) if (c.trim()) set.add(c.trim());
  return Array.from(set);
}

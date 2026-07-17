import { Lang, useLang } from '../i18n';

const LANGS: { key: Lang; label: string }[] = [
  { key: 'tg', label: 'Тоҷикӣ' },
  { key: 'ru', label: 'Русский' },
];

export function LangSwitch({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <div className={`lang-switch ${compact ? 'compact' : ''}`}>
      {LANGS.map((l) => (
        <button
          key={l.key}
          type="button"
          className={`lang-option ${lang === l.key ? 'active' : ''}`}
          onClick={() => setLang(l.key)}
        >
          {compact ? l.key.toUpperCase() : l.label}
        </button>
      ))}
    </div>
  );
}

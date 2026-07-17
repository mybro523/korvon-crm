import { createContext, ReactNode, useContext, useState } from 'react';
import { notificationReplacements, ru, ruServerMessages } from './ru';
import { Dict, t as tj } from './tj';

export type Lang = 'tg' | 'ru';

const LANG_KEY = 'korvon_lang';

const readStored = (): Lang => {
  const v = localStorage.getItem(LANG_KEY);
  return v === 'ru' ? 'ru' : 'tg';
};

/** модульная копия для не-React кода (extractError и т.п.) */
let currentLang: Lang = readStored();

export const getLang = (): Lang => currentLang;
export const getDict = (): Dict => (currentLang === 'ru' ? ru : tj);

/** переводит известные сообщения backend (таджикский) при русском интерфейсе */
export function localizeServerMessage(msg: string): string {
  if (currentLang !== 'ru') return msg;
  for (const [re, replacement] of ruServerMessages) {
    if (re.test(msg)) return msg.replace(re, replacement);
  }
  return msg;
}

/** переводит тело уведомления о продаже (метки + значения) при русском интерфейсе */
export function localizeNotification(msg: string): string {
  if (currentLang !== 'ru') return msg;
  let out = msg;
  for (const [tjText, ruText] of notificationReplacements) {
    out = out.split(tjText).join(ruText);
  }
  return out;
}

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dict;
}

const LangContext = createContext<LangContextValue>({
  lang: currentLang,
  setLang: () => {},
  t: getDict(),
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(currentLang);

  const setLang = (l: Lang) => {
    currentLang = l;
    localStorage.setItem(LANG_KEY, l);
    setLangState(l);
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t: lang === 'ru' ? ru : tj }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);

/** словарь текущего языка — реактивный */
export const useT = (): Dict => useContext(LangContext).t;

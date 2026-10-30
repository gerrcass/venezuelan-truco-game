import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { CONTENT } from './index';
import { LocaleContext } from './locale-context';
import type { Locale } from './types';

const STORAGE_KEY = 'truco.locale';

function isLocale(value: string | null): value is Locale {
  return value === 'es' || value === 'en';
}

function initialLocale(): Locale {
  const requested = new URLSearchParams(window.location.search).get('lang');

  if (isLocale(requested)) {
    return requested;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (isLocale(stored)) {
      return stored;
    }
  } catch {
    // Storage can be unavailable in private windows; Spanish remains the default.
  }

  return 'es';
}

interface LocaleProviderProps {
  readonly initialLocale?: Locale;
}

export function LocaleProvider({
  children,
  initialLocale: requested,
}: PropsWithChildren<LocaleProviderProps>) {
  const [locale, setLocaleState] = useState<Locale>(() => requested ?? initialLocale());
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);

    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The table still works when the browser refuses to remember the choice.
    }
  }, []);

  const content = CONTENT[locale];

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = content.meta.title;

    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute('content', content.meta.description);
  }, [content, locale]);

  const value = useMemo(() => ({ locale, content, setLocale }), [content, locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

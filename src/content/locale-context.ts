import { createContext, useContext } from 'react';

import type { Locale, ShellContent } from './types';

export interface LocaleContextValue {
  readonly locale: Locale;
  readonly content: ShellContent;
  readonly setLocale: (locale: Locale) => void;
}

export const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);

  if (!value) {
    throw new Error('useLocale must be used inside a LocaleProvider.');
  }

  return value;
}

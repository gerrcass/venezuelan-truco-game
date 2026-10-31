import { en } from './en';
import { es } from './es';
import type { Locale, ShellContent } from './types';

export const CONTENT: Record<Locale, ShellContent> = { es, en };

export { en, es };
export type { CardCopy, Locale, LogKind, PersonaCopy, ShellContent } from './types';
export { describeCard, shortCardName } from './types';

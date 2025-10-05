import { translations, Locale } from './translations';

export function useTranslations(locale: Locale | string) {
  // Fallback to 'en' if locale is invalid or undefined
  const validLocale = (locale && locale in translations ? locale : 'en') as Locale;
  return translations[validLocale];
}

export { translations };
export type { Locale };

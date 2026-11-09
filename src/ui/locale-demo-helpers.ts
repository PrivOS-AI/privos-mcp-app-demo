/**
 * Pure helpers behind the Language & locale tab, kept out of the component so they can be tested
 * without a DOM. See `locale-panel.tsx` for how the Hub's `locale` reaches the app.
 */

/** The languages this demo ships its own text in. Every other locale falls back to English text. */
export const DEMO_LANGUAGES = ['en', 'vi'] as const;
export type DemoLanguage = (typeof DEMO_LANGUAGES)[number];

export type LocaleSource = 'host' | 'browser' | 'default';

function canonical(tag: string | undefined): string | undefined {
  if (!tag) return undefined;
  try {
    return Intl.getCanonicalLocales(tag)[0];
  } catch {
    return undefined;
  }
}

/**
 * The locale to format with: the Hub's `locale` when it sent one, else the browser language
 * (older Hub, or the app running outside a workspace), else `en`.
 */
export function resolveDemoLocale(hostLocale: string | undefined, browserLanguage: string | undefined): { locale: string; source: LocaleSource } {
  const fromHost = canonical(hostLocale);
  if (fromHost) return { locale: fromHost, source: 'host' };
  const fromBrowser = canonical(browserLanguage);
  if (fromBrowser) return { locale: fromBrowser, source: 'browser' };
  return { locale: 'en', source: 'default' };
}

/** Matches on the language subtag (`vi-VN` → `vi`), so any regional variant gets the translation. */
export function pickDemoLanguage(locale: string): DemoLanguage {
  const base = locale.split('-')[0].toLowerCase();
  return (DEMO_LANGUAGES as readonly string[]).includes(base) ? (base as DemoLanguage) : 'en';
}

export interface LocaleSamples {
  date: string;
  number: string;
  currency: string;
  relativeTime: string;
}

/** Formats with the full tag, not just the subtag, so regional conventions (`pt-BR` vs `pt-PT`) hold. */
export function formatLocaleSamples(locale: string, now: Date): LocaleSamples {
  return {
    date: new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short' }).format(now),
    number: new Intl.NumberFormat(locale).format(1234567.891),
    currency: new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(1234.5),
    relativeTime: new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-1, 'day'),
  };
}

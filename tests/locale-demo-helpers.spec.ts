import { describe, expect, it } from 'vitest';
import { formatLocaleSamples, pickDemoLanguage, resolveDemoLocale } from '../src/ui/locale-demo-helpers';

describe('resolveDemoLocale', () => {
  it('prefers the locale the Hub sent', () => {
    expect(resolveDemoLocale('vi-VN', 'en-US')).toEqual({ locale: 'vi-VN', source: 'host' });
  });

  it('falls back to the browser language when the Hub sent none (older Hub, or standalone)', () => {
    expect(resolveDemoLocale(undefined, 'de-DE')).toEqual({ locale: 'de-DE', source: 'browser' });
  });

  it('skips a malformed tag and ends at en', () => {
    expect(resolveDemoLocale('not a locale', '')).toEqual({ locale: 'en', source: 'default' });
  });
});

describe('pickDemoLanguage', () => {
  it.each([
    ['vi-VN', 'vi'],
    ['vi', 'vi'],
    ['en-GB', 'en'],
    ['de-DE', 'en'],
  ])('picks the demo text language for %s', (locale, expected) => {
    expect(pickDemoLanguage(locale)).toBe(expected);
  });
});

describe('formatLocaleSamples', () => {
  const now = new Date(Date.UTC(2026, 10, 9, 12, 0));

  it('formats numbers with the conventions of the full tag', () => {
    expect(formatLocaleSamples('en-US', now).number).toBe('1,234,567.891');
    expect(formatLocaleSamples('de-DE', now).number).toBe('1.234.567,891');
  });

  // Lower-cased: ICU versions differ on capitalisation ('Hôm qua' vs 'hôm qua').
  it('writes the relative time in the locale language', () => {
    expect(formatLocaleSamples('en', now).relativeTime.toLowerCase()).toBe('yesterday');
    expect(formatLocaleSamples('vi-VN', now).relativeTime.toLowerCase()).toBe('hôm qua');
  });
});

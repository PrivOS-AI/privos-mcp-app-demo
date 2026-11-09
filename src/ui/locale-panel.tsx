/**
 * Language & locale panel — visible proof that this app follows the user's Hub language.
 *
 * The Hub sends `locale` (a canonical BCP 47 tag such as `vi-VN`: the user's own language, else
 * the workspace default) on every `HOST_CONTEXT_CHANGED`, announced by `hostCapabilities.locale`,
 * and re-sends it when the user switches language. `@privos_ai/app-react` (SDK >= 0.9.0) exposes
 * it as `usePrivosContext().locale`, so this component re-renders on a switch with no reload.
 *
 * The panel uses it the two ways an app should: it picks its own text from a small catalog
 * (English and Vietnamese here) by language subtag, and formats dates and numbers with the full
 * tag through `Intl`. Only this panel is translated, so it sets `lang` on its own container, not on
 * `<html>`: the rest of the demo stays English and must stay tagged English for screen readers.
 *
 * Host-agnostic: with no `locale` (older Hub, or run standalone) it falls back to the browser
 * language and says so.
 */
import { usePrivosContext } from '@privos_ai/app-react';
import { formatLocaleSamples, pickDemoLanguage, resolveDemoLocale, type DemoLanguage, type LocaleSource } from './locale-demo-helpers';

const STRINGS: Record<DemoLanguage, { greeting: string; switchHint: string }> = {
  en: {
    greeting: 'Hello! This panel follows the language you use in PrivOS.',
    switchHint: 'Change your language in Account → Preferences → Language and this panel updates without a reload.',
  },
  vi: {
    greeting: 'Xin chào! Bảng này dùng theo ngôn ngữ bạn chọn trong PrivOS.',
    switchHint: 'Đổi ngôn ngữ ở Tài khoản → Tùy chọn → Ngôn ngữ, bảng này sẽ cập nhật ngay mà không cần tải lại.',
  },
};

const SOURCE_LABEL: Record<LocaleSource, string> = {
  host: 'sent by the Hub',
  browser: 'browser language (the Hub sent no locale)',
  default: 'built-in default',
};

export default function LocalePanel() {
  const { locale: hostLocale } = usePrivosContext();
  const { locale, source } = resolveDemoLocale(hostLocale, navigator.language);
  const language = pickDemoLanguage(locale);
  const samples = formatLocaleSamples(locale, new Date());
  const text = STRINGS[language];

  const rows: { label: string; code: string; value: string }[] = [
    { label: 'Locale from the Hub', code: 'usePrivosContext().locale', value: hostLocale ?? '(not provided)' },
    { label: 'Locale used for formatting', code: SOURCE_LABEL[source], value: locale },
    { label: 'Language of this panel’s text', code: 'pickDemoLanguage(locale)', value: language },
    { label: 'Date and time', code: 'Intl.DateTimeFormat', value: samples.date },
    { label: 'Number', code: 'Intl.NumberFormat', value: samples.number },
    { label: 'Currency (EUR)', code: 'Intl.NumberFormat currency', value: samples.currency },
    { label: 'Relative time (−1 day)', code: 'Intl.RelativeTimeFormat', value: samples.relativeTime },
  ];

  return (
    <div className="container theme-demo-container">
      <h1>Language &amp; locale</h1>
      <p className="theme-demo-intro">
        This app is a cross-origin iframe, so it cannot read the Hub&apos;s language itself, and the
        browser language is often not the one chosen in the Hub. The Hub pushes its UI language over
        the postMessage bridge instead. Everything below follows it live.
      </p>

      {source !== 'host' && (
        <p className="theme-demo-degraded">
          No <code>locale</code> from the host (older Hub, or run standalone outside a Privos
          workspace). This panel is using the {SOURCE_LABEL[source]} instead.
        </p>
      )}

      <div lang={language} className="locale-demo-greeting">
        <strong>{text.greeting}</strong>
        <p>{text.switchHint}</p>
      </div>

      <h2>Resolved values</h2>
      <div className="theme-demo-token-grid">
        {rows.map((row) => (
          <div key={row.label} className="theme-demo-token-row locale-demo-row">
            <div className="theme-demo-token-label">{row.label}</div>
            <div className="theme-demo-token-code">{row.code}</div>
            <div className="theme-demo-token-value" lang={locale}>
              {row.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

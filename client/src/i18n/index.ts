/**
 * @fileoverview Internationalisation (i18n) system.
 *
 * A minimal, zero-dependency i18n layer built on Zustand.
 *
 * ## Usage
 *
 * ```tsx
 * import { useT } from '../i18n/index.js';
 *
 * function MyComponent() {
 *   const t = useT();
 *   return <button>{t.app.reload}</button>;
 * }
 * ```
 *
 * ## Adding a new locale
 * 1. Create `src/i18n/<code>.ts` following the structure of `en.ts`.
 * 2. Add it to the `LOCALES` map below.
 * 3. It will appear automatically in the language selector.
 *
 * ## Persisted locale
 * The user's language choice is stored in `localStorage` under the key
 * `"smbe-locale"` so the preference survives page refreshes.
 *
 * @module i18n
 */

import { create } from 'zustand';
import en from './en.js';
import fr from './fr.js';
import type { Translations } from './en.js';

// ── Available locales ─────────────────────────────────────────────────────────

/**
 * Map of locale code → translations object.
 * Add new locales here.
 */
export const LOCALES: Record<string, { label: string; translations: Translations }> = {
  en: { label: 'English', translations: en },
  fr: { label: 'Français', translations: fr },
};

/** The default locale used when no preference is stored. */
const DEFAULT_LOCALE = 'en';

/** localStorage key for persisting the locale choice. */
const STORAGE_KEY = 'smbe-locale';

// ── Zustand store ─────────────────────────────────────────────────────────────

interface I18nStore {
  /** Current locale code (e.g. `"en"`, `"fr"`). */
  locale: string;
  /** Current translations object. */
  t: Translations;
  /** Set the active locale and persist the choice to localStorage. */
  setLocale: (code: string) => void;
}

/**
 * Resolve the initial locale:
 * 1. Stored preference in localStorage.
 * 2. Browser language preference (`navigator.language`).
 * 3. Default (`"en"`).
 */
function resolveInitialLocale(): string {
  // 1. Stored preference
  try {
    const stored = typeof localStorage !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY)
      : null;
    if (stored && LOCALES[stored]) return stored;
  } catch {
    // localStorage may be unavailable in some environments.
  }

  // 2. Browser preference
  try {
    const browserLang = typeof navigator !== 'undefined'
      ? navigator.language?.split('-')[0]
      : null;
    if (browserLang && LOCALES[browserLang]) return browserLang;
  } catch {
    // navigator may be unavailable (SSR).
  }

  // 3. Default
  return DEFAULT_LOCALE;
}

const initialLocale = resolveInitialLocale();

export const useI18nStore = create<I18nStore>((set) => ({
  locale: initialLocale,
  t:      LOCALES[initialLocale]?.translations ?? en,

  setLocale: (code: string) => {
    const entry = LOCALES[code];
    if (!entry) return;
    // Persist choice
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, code);
    } catch { /* ignore */ }
    set({ locale: code, t: entry.translations });
  },
}));

// ── Public hook ───────────────────────────────────────────────────────────────

/**
 * React hook that returns the current translations object.
 *
 * Subscribes to locale changes so components re-render automatically
 * when the user switches language.
 *
 * @returns {Translations} The current locale's translation strings.
 *
 * @example
 * const t = useT();
 * return <span>{t.app.reload}</span>;
 */
export function useT(): Translations {
  return useI18nStore(s => s.t);
}

/**
 * React hook that returns the locale setter and current code.
 *
 * @returns {{ locale: string; setLocale: (code: string) => void }}
 */
export function useLocale(): { locale: string; setLocale: (code: string) => void } {
  const locale    = useI18nStore(s => s.locale);
  const setLocale = useI18nStore(s => s.setLocale);
  return { locale, setLocale };
}

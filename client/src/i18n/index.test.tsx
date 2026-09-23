import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

async function initialize(storage: unknown, navigatorValue: unknown) {
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('navigator', navigatorValue);
  vi.resetModules();
  return import('./index.js');
}
function storage(value: string | null = null) {
  return { getItem: vi.fn(() => value), setItem: vi.fn() };
}

beforeEach(() => vi.resetModules());
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('locale initialization and persistence', () => {
  it('prefers a supported persisted locale, persists switches and updates both public hooks', async () => {
    const persisted = storage('fr');
    const api = await initialize(persisted, { language: 'de-DE' });
    expect(api.LOCALES.fr.label).toBe('Français');
    expect(api.useI18nStore.getState().locale).toBe('fr');
    const { result } = renderHook(() => ({ locale: api.useLocale(), t: api.useT() }));
    expect(result.current.t).toBe(api.LOCALES.fr.translations);
    act(() => result.current.locale.setLocale('ja'));
    expect(result.current.locale.locale).toBe('ja');
    expect(result.current.t).toBe(api.LOCALES.ja.translations);
    expect(persisted.setItem).toHaveBeenCalledWith('smbe-locale', 'ja');
    act(() => result.current.locale.setLocale('unknown'));
    expect(result.current.locale.locale).toBe('ja');
    expect(persisted.setItem).toHaveBeenCalledTimes(1);
  });

  it.each(['en-US', 'FR-fr', 'de-DE', 'es-MX', 'ru-RU', 'ja-JP'])('uses supported browser language %s when storage has no valid preference', async language => {
    const api = await initialize(storage('unsupported'), { language });
    expect(api.useI18nStore.getState().locale).toBe(language.split('-')[0].toLowerCase());
  });

  it('works without browser globals, unavailable storage, or a failing navigator getter', async () => {
    let api = await initialize(undefined, undefined);
    expect(api.useI18nStore.getState().locale).toBe('en');
    api.useI18nStore.getState().setLocale('fr');
    expect(api.useI18nStore.getState().locale).toBe('fr');
    api = await initialize({ getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } }, { language: 'es-ES' });
    expect(api.useI18nStore.getState().locale).toBe('es');
    expect(() => api.useI18nStore.getState().setLocale('ru')).not.toThrow();
    expect(api.useI18nStore.getState().locale).toBe('ru');
    api = await initialize(storage(), { get language() { throw new Error('unavailable'); } });
    expect(api.useI18nStore.getState().locale).toBe('en');
  });

  it.each([undefined, '', 'zz-ZZ'])('uses English when browser language %s is missing or unsupported', async language => {
    const api = await initialize(storage(), { language });
    expect(api.useI18nStore.getState().t).toBe(api.LOCALES.en.translations);
  });

  it.each(['constructor', '__proto__', 'toString'])('rejects inherited property %s as a locale from all sources', async code => {
    const api = await initialize(storage(code), { language: code });
    expect(api.useI18nStore.getState().locale).toBe('en');
    api.useI18nStore.getState().setLocale(code);
    expect(api.useI18nStore.getState().t).toBe(api.LOCALES.en.translations);
    expect(api.useI18nStore.getState().locale).toBe('en');
  });
});

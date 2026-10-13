/**
 * Language service — manages the active display language for the compendium.
 * Persists the user's choice in localStorage so it survives page refreshes.
 */

import { Injectable, computed, signal, type Signal, type WritableSignal } from '@angular/core';

import { type SupportedLanguage } from '@guild/models/language.model';

const STORAGE_KEY = 'campaign_companion_language';
const DEFAULT_LANGUAGE: SupportedLanguage = 'it';

/**
 * Singleton service that exposes the current display language as a signal.
 * The choice is persisted in localStorage.
 *
 * @example
 * ```typescript
 * private readonly languageService = inject(LanguageService);
 * readonly lang = this.languageService.currentLanguage;
 * ```
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly _currentLanguage: WritableSignal<SupportedLanguage>;

  /** The currently active display language. */
  readonly currentLanguage: Signal<SupportedLanguage>;

  /**
   * Convenience derived signal: `true` when the active language is Italian.
   * Prefer this over locally re-deriving `currentLanguage() === 'it'` in
   * every consumer (DRY).
   */
  readonly isItalian: Signal<boolean>;

  constructor() {
    this._currentLanguage = signal(this.loadFromStorage());
    this.currentLanguage = this._currentLanguage.asReadonly();
    this.isItalian = computed((): boolean => this._currentLanguage() === 'it');
  }

  /**
   * Toggles the language between 'en' and 'it'.
   */
  toggle(): void {
    const next: SupportedLanguage = this._currentLanguage() === 'en' ? 'it' : 'en';
    this.setLanguage(next);
  }

  /**
   * Sets the display language explicitly.
   * @param language - The language to activate.
   */
  setLanguage(language: SupportedLanguage): void {
    this._currentLanguage.set(language);
    this.saveToStorage(language);
  }

  /**
   * Loads the stored language from localStorage.
   * Falls back to the default language if no valid value is found.
   */
  private loadFromStorage(): SupportedLanguage {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'it') {
        return stored;
      }
      return DEFAULT_LANGUAGE;
    } catch {
      return DEFAULT_LANGUAGE;
    }
  }

  /**
   * Persists the language choice to localStorage.
   * @param language - The language to save.
   */
  private saveToStorage(language: SupportedLanguage): void {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // localStorage may be unavailable — fail silently
    }
  }
}

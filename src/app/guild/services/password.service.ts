/**
 * Client-side password protection service.
 * Manages unlock state per character, persisted in sessionStorage.
 * Unlock state survives page refreshes but clears when the browser tab closes.
 */

import { Injectable, signal, computed, type Signal, type WritableSignal } from '@angular/core';

const STORAGE_KEY = 'campaign_companion_unlocked';

/**
 * Manages password-based access to private character sections.
 * Stores unlocked character IDs in sessionStorage.
 *
 * @example
 * ```typescript
 * private readonly passwordService = inject(PasswordService);
 * const isOpen = this.passwordService.isUnlocked('gundren');
 * ```
 */
@Injectable({ providedIn: 'root' })
export class PasswordService {
  private readonly _unlockedIds: WritableSignal<ReadonlySet<string>>;

  constructor() {
    this._unlockedIds = signal(this.loadFromStorage());
  }

  /**
   * Checks whether a character's private sections are currently unlocked.
   * @param characterId - The character ID to check.
   * @returns A signal that emits true if the character is unlocked.
   */
  isUnlocked(characterId: string): Signal<boolean> {
    return computed(() => this._unlockedIds().has(characterId));
  }

  /**
   * Attempts to unlock a character by verifying the provided password.
   * @param characterId - The character ID to unlock.
   * @param inputPassword - The password entered by the user.
   * @param storedPassword - The correct password from the character data.
   * @returns True if the password matched and the character was unlocked.
   */
  unlock(characterId: string, inputPassword: string, storedPassword: string): boolean {
    if (inputPassword !== storedPassword) {
      return false;
    }

    const updated = new Set(this._unlockedIds());
    updated.add(characterId);
    this._unlockedIds.set(updated);
    this.saveToStorage(updated);
    return true;
  }

  /**
   * Locks a character's private sections again.
   * @param characterId - The character ID to lock.
   */
  lock(characterId: string): void {
    const updated = new Set(this._unlockedIds());
    updated.delete(characterId);
    this._unlockedIds.set(updated);
    this.saveToStorage(updated);
  }

  /**
   * Loads unlocked character IDs from sessionStorage.
   * @returns A set of previously unlocked character IDs.
   */
  private loadFromStorage(): ReadonlySet<string> {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        return new Set<string>();
      }
      const parsed: unknown = JSON.parse(raw);
      if (
        Array.isArray(parsed) &&
        parsed.every((item): item is string => typeof item === 'string')
      ) {
        return new Set<string>(parsed);
      }
      return new Set<string>();
    } catch {
      return new Set<string>();
    }
  }

  /**
   * Persists unlocked character IDs to sessionStorage.
   * @param ids - The set of unlocked character IDs to save.
   */
  private saveToStorage(ids: ReadonlySet<string>): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
      // Even a Bag of Holding has its limits — sessionStorage might be full
    }
  }
}

/**
 * Generic persistence wrapper for Angular `WritableSignal` values.
 *
 * Reads the initial value from `localStorage` (falling back to the supplied
 * default when the key is absent or the payload is malformed) and writes
 * back any subsequent change via an `effect`. Designed to be called from a
 * component/service field initializer where an injection context is active.
 *
 * Transparently handles `Set<unknown>` by serializing to a tagged array.
 */

import { effect, signal, type WritableSignal } from '@angular/core';

/** Common prefix applied to every persisted key for namespacing. */
const STORAGE_PREFIX = 'campaign-companion:';

/** Tag used to round-trip `Set` instances through JSON. */
const SET_TAG = '__phSet';

interface SetEnvelope {
  readonly [SET_TAG]: ReadonlyArray<unknown>;
}

/**
 * Detects whether a JSON-parsed payload is the {@link SET_TAG} envelope used
 * to round-trip `Set` instances.
 * @param value - Parsed JSON value of unknown shape.
 * @returns `true` if the payload represents a serialized `Set`.
 */
function isSetEnvelope(value: unknown): value is SetEnvelope {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate[SET_TAG]);
}

/**
 * Serializes a value for `localStorage`. `Set` instances are wrapped in a
 * tagged envelope so they can be reconstructed on read.
 * @param value - Any JSON-serializable value, including `Set`.
 * @returns A JSON string ready to be stored.
 */
function serialize(value: unknown): string {
  if (value instanceof Set) {
    const envelope: SetEnvelope = { [SET_TAG]: Array.from(value) };
    return JSON.stringify(envelope);
  }
  return JSON.stringify(value);
}

/**
 * Deserializes a payload previously written by {@link serialize}.
 * Returns `undefined` when the raw string is missing or malformed so the
 * caller can fall back to its default.
 * @param raw - Raw JSON string from `localStorage`, or `null`.
 * @returns The reconstructed value or `undefined` on failure.
 */
function deserialize(raw: string | null): unknown {
  if (raw === null) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isSetEnvelope(parsed)) {
      return new Set(parsed[SET_TAG]);
    }
    return parsed;
  } catch {
    // Malformed payload — fall through to the caller's default.
    return undefined;
  }
}

/**
 * Reads a previously persisted value from `localStorage`.
 * @param key - Fully qualified storage key (already prefixed).
 * @returns The hydrated value, or `undefined` if missing/unavailable.
 */
function readFromStorage(key: string): unknown {
  if (typeof localStorage === 'undefined') {
    return undefined;
  }
  try {
    return deserialize(localStorage.getItem(key));
  } catch {
    return undefined;
  }
}

/**
 * Writes a value to `localStorage`. Silently swallows storage errors
 * (private mode, quota exceeded) so the UI never breaks.
 * @param key - Fully qualified storage key (already prefixed).
 * @param value - Value to persist.
 */
function writeToStorage(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(key, serialize(value));
  } catch {
    // Intentionally ignored.
  }
}

/**
 * Creates a `WritableSignal<T>` whose value is mirrored to `localStorage`.
 *
 * Must be called inside an injection context (e.g. component/service field
 * initializer or `runInInjectionContext`) so the underlying `effect` can be
 * registered.
 *
 * @param key - Stable, human-readable identifier; namespaced internally with
 *              `campaign-companion:` so callers don't need to repeat the prefix.
 * @param initial - Default value used when no payload exists in storage or
 *                  when the stored payload fails the `validate` guard.
 * @param validate - Type guard ensuring the deserialized payload matches `T`.
 *                   Required because `localStorage` returns untyped data.
 * @returns A writable signal whose `set`/`update` calls auto-persist.
 */
export function persistedSignal<T>(
  key: string,
  initial: T,
  validate: (value: unknown) => value is T,
): WritableSignal<T> {
  const fullKey = `${STORAGE_PREFIX}${key}`;
  const stored = readFromStorage(fullKey);
  const seed = validate(stored) ? stored : initial;
  const sig = signal<T>(seed);

  effect((): void => {
    writeToStorage(fullKey, sig());
  });

  return sig;
}

/**
 * Convenience guard for `Set<string>` payloads — the most common shape used
 * by chip-group filters in this app.
 * @param value - Unknown payload from storage.
 * @returns `true` when `value` is a `Set` whose items are all strings.
 */
export function isStringSet(value: unknown): value is Set<string> {
  if (!(value instanceof Set)) {
    return false;
  }
  for (const item of value) {
    if (typeof item !== 'string') {
      return false;
    }
  }
  return true;
}

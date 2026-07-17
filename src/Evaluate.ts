import type { Evaluate } from './types';

/**
 * Creates an Evaluate instance for a feature flag value.
 * This is a factory function that returns a plain object with methods
 * to check the feature flag state.
 *
 * `resolvedValue` is the evaluated variant's JSON config payload, embedded directly on the
 * matched rule in the /evaluate response — kept separate from `value`, which must stay a plain
 * string: `is()`/`isOn()`/`isOff()` do string comparisons on it.
 */
export default function createEvaluate(value: string, resolvedValue?: unknown): Evaluate {
  const storedValue = value.toLowerCase();

  return {
    value(): string {
      return storedValue;
    },

    is(value: string): boolean {
      return value.toLowerCase() === storedValue;
    },

    isOn(): boolean {
      return storedValue === 'on';
    },

    isOff(): boolean {
      return storedValue === 'off';
    },

    jsonValue<T = unknown>(): T | undefined {
      return resolvedValue as T | undefined;
    }
  };
}

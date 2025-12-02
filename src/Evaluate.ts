import type { Evaluate } from './types';

/**
 * Creates an Evaluate instance for a feature flag value.
 * This is a factory function that returns a plain object with methods
 * to check the feature flag state.
 */
export default function createEvaluate(value: string): Evaluate {
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
    }
  };
}

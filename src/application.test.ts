import { describe, it, expect, jest, afterEach } from '@jest/globals';
import { sanitiseApplication } from './application';

describe('sanitiseApplication', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('passes a valid slug through', () => {
    expect(sanitiseApplication('web-app')).toBe('web-app');
    expect(sanitiseApplication('checkout_api.v2')).toBe('checkout_api.v2');
  });

  it('forgives case and surrounding whitespace', () => {
    expect(sanitiseApplication('  Web-App ')).toBe('web-app');
  });

  it('drops invalid values with a warning', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(sanitiseApplication('web app!')).toBeUndefined();
    expect(sanitiseApplication('a'.repeat(65))).toBeUndefined();
    expect(sanitiseApplication(42)).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it('treats absent or empty as no tag, without warning', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(sanitiseApplication(undefined)).toBeUndefined();
    expect(sanitiseApplication(null)).toBeUndefined();
    expect(sanitiseApplication('')).toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });
});

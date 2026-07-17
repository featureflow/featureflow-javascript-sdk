import { describe, it, expect } from '@jest/globals';
import createEvaluate from './Evaluate';

describe('createEvaluate', () => {
  it('value()/is()/isOn()/isOff() are unaffected by resolvedValue — still plain string comparisons', () => {
    const evaluate = createEvaluate('On', { color: '#0066cc' });
    expect(evaluate.value()).toBe('on');
    expect(evaluate.is('on')).toBe(true);
    expect(evaluate.isOn()).toBe(true);
    expect(evaluate.isOff()).toBe(false);
  });

  it('jsonValue() returns the resolved JSON payload', () => {
    const evaluate = createEvaluate('on', { color: '#0066cc', maxItems: 10 });
    expect(evaluate.jsonValue()).toEqual({ color: '#0066cc', maxItems: 10 });
  });

  it('jsonValue() returns undefined when no resolvedValue was provided', () => {
    const evaluate = createEvaluate('off');
    expect(evaluate.jsonValue()).toBeUndefined();
  });
});

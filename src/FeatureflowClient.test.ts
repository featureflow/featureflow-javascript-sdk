import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import Featureflow from './index';
import FeatureflowClient from './FeatureflowClient';
import type { Feature, Config } from './types';

describe('Featureflow', () => {
  const FF_KEY = 'test-api-key';
  
  describe('init', () => {
    it('should initialize Featureflow with API key', async () => {
      const featureflow = await Featureflow.init(FF_KEY, {
        offline: true,
        defaultFeatures: {
          'test-feature': 'on'
        }
      });
      
      expect(featureflow).toBeInstanceOf(FeatureflowClient);
      expect(featureflow.apiKey).toBe(FF_KEY);
    });

    it('should throw error if API key is missing', async () => {
      await expect(
        Featureflow.init('', {})
      ).rejects.toThrow('init() has not been called with a valid apiKey');
    });

    it('should initialize with user context', async () => {
      const user = {
        id: 'user123',
        attributes: {
          tier: 'gold',
          country: 'australia'
        }
      };

      const featureflow = await Featureflow.init(FF_KEY, user, {
        offline: true,
        delayInit: false,
        defaultFeatures: {
          'test-feature': 'on'
        }
      });

      const retrievedUser = featureflow.getUser();
      expect(retrievedUser.id).toBe('user123');
      expect(retrievedUser.attributes?.tier).toBe('gold');
      expect(retrievedUser.attributes?.country).toBe('australia');
    });
  });

  describe('evaluate', () => {
    let featureflow: FeatureflowClient;

    beforeEach(async () => {
      featureflow = await Featureflow.init(FF_KEY, { id: 'test-user' }, {
        offline: true,
        defaultFeatures: {
          'feature-on': 'on',
          'feature-off': 'off',
          'feature-red': 'red'
        }
      });
    });

    it('should return Evaluate object with correct methods', () => {
      const result = featureflow.evaluate('feature-on');
      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('is');
      expect(result).toHaveProperty('isOn');
      expect(result).toHaveProperty('isOff');
      expect(typeof result.value).toBe('function');
      expect(typeof result.is).toBe('function');
      expect(typeof result.isOn).toBe('function');
      expect(typeof result.isOff).toBe('function');
    });

    it('should return correct feature value', () => {
      const result = featureflow.evaluate('feature-on');
      expect(result.value()).toBe('on');
    });

    it('should return "off" for unknown features', () => {
      const result = featureflow.evaluate('unknown-feature');
      expect(result.value()).toBe('off');
    });

    it('should correctly identify if feature is ON', () => {
      const resultOn = featureflow.evaluate('feature-on');
      const resultOff = featureflow.evaluate('feature-off');
      
      expect(resultOn.isOn()).toBe(true);
      expect(resultOff.isOn()).toBe(false);
    });

    it('should correctly identify if feature is OFF', () => {
      const resultOn = featureflow.evaluate('feature-on');
      const resultOff = featureflow.evaluate('feature-off');
      
      expect(resultOn.isOff()).toBe(false);
      expect(resultOff.isOff()).toBe(true);
    });

    it('should correctly check feature variant', () => {
      const resultRed = featureflow.evaluate('feature-red');
      const resultOn = featureflow.evaluate('feature-on');
      
      expect(resultRed.is('red')).toBe(true);
      expect(resultRed.is('on')).toBe(false);
      expect(resultOn.is('on')).toBe(true);
    });
  });

  describe('getFeatures', () => {
    it('should return all evaluated features', async () => {
      const featureflow = await Featureflow.init(FF_KEY, {
        offline: true,
        defaultFeatures: {
          'feature-1': 'on',
          'feature-2': 'off',
          'feature-3': 'blue'
        }
      });

      const features = featureflow.getFeatures();
      
      expect(features).toHaveProperty('feature-1');
      expect(features).toHaveProperty('feature-2');
      expect(features).toHaveProperty('feature-3');
      expect(features['feature-1']).toBe('on');
      expect(features['feature-2']).toBe('off');
      expect(features['feature-3']).toBe('blue');
    });
  });

  describe('updateUser', () => {
    it('should update user context', async () => {
      const featureflow = await Featureflow.init(FF_KEY, {
        id: 'user1',
        attributes: { tier: 'gold' }
      }, {
        offline: true,
        defaultFeatures: {
          'test-feature': 'on'
        }
      });

      const newUser = {
        id: 'user2',
        attributes: {
          tier: 'premium',
          country: 'usa'
        }
      };

      await featureflow.updateUser(newUser);
      const updatedUser = featureflow.getUser();
      expect(updatedUser.id).toBe('user2');
      expect(updatedUser.attributes?.tier).toBe('premium');
      expect(updatedUser.attributes?.country).toBe('usa');
    });
  });

  describe('events', () => {
    it('should emit INIT event when features are loaded', async () => {
      const featureflow = await Featureflow.init(FF_KEY, {
        offline: true,
        defaultFeatures: {
          'test-feature': 'on'
        }
      });

      // INIT event should have been emitted during initialization
      const features = featureflow.getFeatures();
      expect(features).toHaveProperty('test-feature');
      expect(features['test-feature']).toBe('on');
    });
  });

  describe('date and hour of day evaluation', () => {

    // Helper to create config with Feature objects
    const createConfigWithFeatures = (features: { [key: string]: Feature }): Config => {
      return {
        offline: true,
        defaultFeatures: features as { [key: string]: string }
      } as Config;
    };

    beforeEach(() => {
      // No need for date/time mocking when using extreme dates
    });

    afterEach(() => {
      // No need for timer restoration
    });

    describe('featureflow.date evaluation', () => {
      it('should evaluate feature based on date before condition', async () => {
        const featureflow = await Featureflow.init(FF_KEY, { id: 'test-user' }, createConfigWithFeatures({
          'date-feature': {
            rules: [{
              variant: 'on',
              audience: {
                conditions: [{
                  target: 'featureflow.date',
                  operator: 'before',
                  values: ['2040-01-01T00:00:00.000Z'] // Far future
                }]
              }
            }]
          }
        }));
        const result = featureflow.evaluate('date-feature');
        expect(result.value()).toBe('on');
      });

      it('should evaluate feature based on date after condition', async () => {
        const featureflow = await Featureflow.init(FF_KEY, { id: 'test-user' }, createConfigWithFeatures({
          'date-feature': {
            rules: [{
              variant: 'on',
              audience: {
                conditions: [{
                  target: 'featureflow.date',
                  operator: 'after',
                  values: ['2000-01-01T00:00:00.000Z'] // Far past
                }]
              }
            }]
          }
        }));
        const result = featureflow.evaluate('date-feature');
        expect(result.value()).toBe('on');
      });

      it('should return off when date condition does not match', async () => {
        const featureflow = await Featureflow.init(FF_KEY, { id: 'test-user' }, createConfigWithFeatures({
          'date-feature': {
            rules: [{
              variant: 'on',
              audience: {
                conditions: [{
                  target: 'featureflow.date',
                  operator: 'after',
                  values: ['2040-01-01T00:00:00.000Z'] // Far future
                }]
              }
            }]
          }
        }));
        const result = featureflow.evaluate('date-feature');
        expect(result.value()).toBe('off');
      });
    });

    describe('featureflow.hourofday evaluation', () => {
      beforeEach(() => {
        jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
      });
      afterEach(() => {
        jest.restoreAllMocks();
      });
      it('should evaluate feature based on hour of day equals condition', async () => {
        const featureflow = await Featureflow.init(FF_KEY, { id: 'test-user' }, createConfigWithFeatures({
          'hour-feature': {
            rules: [{
              variant: 'on',
              audience: {
                conditions: [{
                  target: 'featureflow.hourofday',
                  operator: 'equals',
                  values: [14] // 2 PM (14:30)
                }]
              }
            }]
          }
        }));

        const result = featureflow.evaluate('hour-feature');
        expect(result.value()).toBe('on');
      });

      it('should evaluate feature based on hour of day greaterThan condition', async () => {
        const featureflow = await Featureflow.init(FF_KEY, { id: 'test-user' }, createConfigWithFeatures({
          'hour-feature': {
            rules: [{
              variant: 'on',
              audience: {
                conditions: [{
                  target: 'featureflow.hourofday',
                  operator: 'greaterThan',
                  values: [12] // After noon
                }]
              }
            }]
          }
        }));

        const result = featureflow.evaluate('hour-feature');
        expect(result.value()).toBe('on');
      });

      it('should evaluate feature based on hour of day lessThan condition', async () => {
        const featureflow = await Featureflow.init(FF_KEY, { id: 'test-user' }, createConfigWithFeatures({
          'hour-feature': {
            rules: [{
              variant: 'on',
              audience: {
                conditions: [{
                  target: 'featureflow.hourofday',
                  operator: 'lessThan',
                  values: [18] // Before 6 PM
                }]
              }
            }]
          }
        }));

        const result = featureflow.evaluate('hour-feature');
        expect(result.value()).toBe('on');
      });

      it('should return off when hour of day condition does not match', async () => {
        const featureflow = await Featureflow.init(FF_KEY, { id: 'test-user' }, createConfigWithFeatures({
          'hour-feature': {
            rules: [{
              variant: 'on',
              audience: {
                conditions: [{
                  target: 'featureflow.hourofday',
                  operator: 'lessThan',
                  values: [10] // Before 10 AM (but it's 2:30 PM)
                }]
              }
            }]
          }
        }));

        const result = featureflow.evaluate('hour-feature');
        expect(result.value()).toBe('off');
      });

      it('should evaluate feature with hour range using greaterThanOrEqual and lessThanOrEqual', async () => {
        const featureflow = await Featureflow.init(FF_KEY, { id: 'test-user' }, createConfigWithFeatures({
          'hour-feature': {
            rules: [{
              variant: 'on',
              audience: {
                conditions: [
                  {
                    target: 'featureflow.hourofday',
                    operator: 'greaterThanOrEqual',
                    values: [12] // After or at noon
                  },
                  {
                    target: 'featureflow.hourofday',
                    operator: 'lessThanOrEqual',
                    values: [15] // Before or at 3 PM
                  }
                ]
              }
            }]
          }
        }));

        const result = featureflow.evaluate('hour-feature');
        expect(result.value()).toBe('on');
      });
    });

    describe('combined date and hour conditions', () => {
      it('should evaluate feature with both date and hour conditions', async () => {
        const featureflow = await Featureflow.init(FF_KEY, { id: 'test-user' }, createConfigWithFeatures({
          'combined-feature': {
            rules: [{
              variant: 'on',
              audience: {
                conditions: [
                  {
                    target: 'featureflow.date',
                    operator: 'after',
                    // Note: 'before' and 'after' operators use a single value (first element of array)
                    values: ['2000-01-01T00:00:00.000Z']
                  },
                  {
                    target: 'featureflow.hourofday',
                    operator: 'greaterThan',
                    values: [12]
                  }
                ]
              }
            }]
          }
        }));

        const result = featureflow.evaluate('combined-feature');
        expect(result.value()).toBe('on');
      });

      it('should return off when one condition fails', async () => {
        const featureflow = await Featureflow.init(FF_KEY, { id: 'test-user' }, createConfigWithFeatures({
          'combined-feature': {
            rules: [{
              variant: 'on',
              audience: {
                conditions: [
                  {
                    target: 'featureflow.date',
                    operator: 'after',
                    // Note: 'before' and 'after' operators use a single value (first element of array)
                    values: ['2000-01-01T00:00:00.000Z']
                  },
                  {
                    target: 'featureflow.hourofday',
                    operator: 'lessThan',
                    values: [10] // Before 10 AM (but it's 2:30 PM)
                  }
                ]
              }
            }]
          }
        }));

        const result = featureflow.evaluate('combined-feature');
        expect(result.value()).toBe('off');
      });
    });

  });

  describe('jsonValue', () => {
    // Constructed directly (not via Featureflow.init) so no real fetch happens — .features is set
    // directly, exercising evaluate()'s resolution logic in isolation. The JSON value now arrives
    // embedded on the matched Rule itself (from a single /evaluate response), not a separate fetch.
    const buildClient = (): FeatureflowClient => {
      const featureflow = new FeatureflowClient('test-api-key', { id: 'test-user' }, { offline: false });
      jest.spyOn(featureflow.restClient, 'postEvaluateEvent').mockImplementation(() => {});
      return featureflow;
    };

    it('resolves the JSON config value embedded on the matched rule', () => {
      const featureflow = buildClient();
      featureflow.features = {
        'my-feature': { rules: [{ variant: 'on', value: { color: '#0066cc', maxItems: 10 } }] }
      };

      const result = featureflow.evaluate('my-feature');
      expect(result.value()).toBe('on');
      expect(result.jsonValue()).toEqual({ color: '#0066cc', maxItems: 10 });
    });

    it('returns undefined when the resolved variant has no value', () => {
      const featureflow = buildClient();
      featureflow.features = {
        'my-feature': { rules: [{ variant: 'off' }] }
      };

      const result = featureflow.evaluate('my-feature');
      expect(result.jsonValue()).toBeUndefined();
    });

    it('does not affect value()/is()/isOn()/isOff(), which stay string-key based', () => {
      const featureflow = buildClient();
      featureflow.features = {
        'my-feature': { rules: [{ variant: 'on', value: { color: '#0066cc' } }] }
      };

      const result = featureflow.evaluate('my-feature');
      expect(result.value()).toBe('on');
      expect(result.is('on')).toBe(true);
      expect(result.isOn()).toBe(true);
    });
  });
});

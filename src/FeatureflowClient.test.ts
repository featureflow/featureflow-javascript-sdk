import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import Featureflow from './index';
import FeatureflowClient from './FeatureflowClient';
import type { Evaluate, Feature, Config } from './types';

describe('Featureflow', () => {
  const FF_KEY = 'test-api-key';
  
  describe('init', () => {
    it('should initialize Featureflow with API key', () => {
      const featureflow = Featureflow.init(FF_KEY, {
        offline: true,
        defaultFeatures: {
          'test-feature': 'on'
        }
      });
      
      expect(featureflow).toBeInstanceOf(FeatureflowClient);
      expect(featureflow.apiKey).toBe(FF_KEY);
    });

    it('should throw error if API key is missing', () => {
      expect(() => {
        Featureflow.init('', {});
      }).toThrow('init() has not been called with a valid apiKey');
    });

    it('should initialize with user context', (done) => {
      const user = {
        id: 'user123',
        attributes: {
          tier: 'gold',
          country: 'australia'
        }
      };

      const featureflow = Featureflow.init(FF_KEY, user, {
        offline: true,
        delayInit: false,
        defaultFeatures: {
          'test-feature': 'on'
        }
      });

      // Wait for initialization to complete (user is set during updateUserWithCache)
      featureflow.on(Featureflow.events.INIT, () => {
        const retrievedUser = featureflow.getUser();
        expect(retrievedUser.id).toBe('user123');
        expect(retrievedUser.attributes?.tier).toBe('gold');
        expect(retrievedUser.attributes?.country).toBe('australia');
        done();
      });
    });
  });

  describe('evaluate', () => {
    let featureflow: FeatureflowClient;

    beforeEach(() => {
      featureflow = Featureflow.init(FF_KEY, { id: 'test-user' }, {
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
    it('should return all evaluated features', () => {
      const featureflow = Featureflow.init(FF_KEY, {
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
    it('should update user context', () => {
      const featureflow = Featureflow.init(FF_KEY, {
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

      featureflow.updateUser(newUser, () => {
        const updatedUser = featureflow.getUser();
        expect(updatedUser.id).toBe('user2');
        expect(updatedUser.attributes?.tier).toBe('premium');
        expect(updatedUser.attributes?.country).toBe('usa');
      });
    });
  });

  describe('events', () => {
    it('should emit INIT event when features are loaded', (done) => {
      const featureflow = Featureflow.init(FF_KEY, {
        offline: true,
        defaultFeatures: {
          'test-feature': 'on'
        }
      });

      featureflow.on(Featureflow.events.INIT, (features: Record<string, unknown>) => {
        expect(features).toHaveProperty('test-feature');
        expect(features['test-feature']).toBe('on');
        done();
      });
    });
  });

  describe('date and hour of day evaluation', () => {
    let mockDate: Date;
    let originalDate: typeof Date;

    // Helper to create config with Feature objects
    const createConfigWithFeatures = (features: { [key: string]: Feature }): Config => {
      return {
        offline: true,
        defaultFeatures: features as { [key: string]: string }
      } as Config;
    };

    // Helper to advance timers and wait for INIT event
    const waitForInit = (featureflow: FeatureflowClient, callback: () => void) => {
      featureflow.on(Featureflow.events.INIT, () => {
        jest.advanceTimersByTime(0); // Allow any pending timers
        callback();
      });
      jest.advanceTimersByTime(100); // Advance timers to trigger INIT
    };

    beforeEach(() => {
      // Mock Date to return a fixed date: 2024-01-15 14:30:00 (2:30 PM) in local timezone
      mockDate = new Date(2024, 0, 15, 14, 30, 0); // Year, Month (0-indexed), Day, Hour, Minute, Second
      jest.useFakeTimers();
      jest.setSystemTime(mockDate);
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    describe('featureflow.date evaluation', () => {
      it('should evaluate feature based on date before condition', (done) => {
        const featureflow = Featureflow.init(FF_KEY, { id: 'test-user' }, createConfigWithFeatures({
          'date-feature': {
            rules: [{
              variant: 'on',
              audience: {
                conditions: [{
                  target: 'featureflow.date',
                  operator: 'before',
                  // Note: 'before' and 'after' operators use a single value (first element of array)
                  values: ['2024-01-20T00:00:00.000Z']
                }]
              }
            }]
          }
        }));

        waitForInit(featureflow, () => {
          const result = featureflow.evaluate('date-feature');
          expect(result.value()).toBe('on');
          done();
        });
      });

      it('should evaluate feature based on date after condition', (done) => {
        const featureflow = Featureflow.init(FF_KEY, { id: 'test-user' }, createConfigWithFeatures({
          'date-feature': {
            rules: [{
              variant: 'on',
              audience: {
                conditions: [{
                  target: 'featureflow.date',
                  operator: 'after',
                  // Note: 'before' and 'after' operators use a single value (first element of array)
                  values: ['2024-01-10T00:00:00.000Z']
                }]
              }
            }]
          }
        }));

        waitForInit(featureflow, () => {
          const result = featureflow.evaluate('date-feature');
          expect(result.value()).toBe('on');
          done();
        });
      });

      it('should return off when date condition does not match', (done) => {
        const featureflow = Featureflow.init(FF_KEY, { id: 'test-user' }, createConfigWithFeatures({
          'date-feature': {
            rules: [{
              variant: 'on',
              audience: {
                conditions: [{
                  target: 'featureflow.date',
                  operator: 'after',
                  // Note: 'before' and 'after' operators use a single value (first element of array)
                  values: ['2024-01-20T00:00:00.000Z'] // After our mock date
                }]
              }
            }]
          }
        }));

        waitForInit(featureflow, () => {
          const result = featureflow.evaluate('date-feature');
          expect(result.value()).toBe('off');
          done();
        });
      });
    });

    describe('featureflow.hourofday evaluation', () => {
      it('should evaluate feature based on hour of day equals condition', (done) => {
        const featureflow = Featureflow.init(FF_KEY, { id: 'test-user' }, createConfigWithFeatures({
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

        waitForInit(featureflow, () => {
          const result = featureflow.evaluate('hour-feature');
          expect(result.value()).toBe('on');
          done();
        });
      });

      it('should evaluate feature based on hour of day greaterThan condition', (done) => {
        const featureflow = Featureflow.init(FF_KEY, { id: 'test-user' }, createConfigWithFeatures({
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

        waitForInit(featureflow, () => {
          const result = featureflow.evaluate('hour-feature');
          expect(result.value()).toBe('on');
          done();
        });
      });

      it('should evaluate feature based on hour of day lessThan condition', (done) => {
        const featureflow = Featureflow.init(FF_KEY, { id: 'test-user' }, createConfigWithFeatures({
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

        waitForInit(featureflow, () => {
          const result = featureflow.evaluate('hour-feature');
          expect(result.value()).toBe('on');
          done();
        });
      });

      it('should return off when hour of day condition does not match', (done) => {
        const featureflow = Featureflow.init(FF_KEY, { id: 'test-user' }, createConfigWithFeatures({
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

        waitForInit(featureflow, () => {
          const result = featureflow.evaluate('hour-feature');
          expect(result.value()).toBe('off');
          done();
        });
      });

      it('should evaluate feature with hour range using greaterThanOrEqual and lessThanOrEqual', (done) => {
        const featureflow = Featureflow.init(FF_KEY, { id: 'test-user' }, createConfigWithFeatures({
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

        waitForInit(featureflow, () => {
          const result = featureflow.evaluate('hour-feature');
          expect(result.value()).toBe('on');
          done();
        });
      });
    });

    describe('combined date and hour conditions', () => {
      it('should evaluate feature with both date and hour conditions', (done) => {
        const featureflow = Featureflow.init(FF_KEY, { id: 'test-user' }, createConfigWithFeatures({
          'combined-feature': {
            rules: [{
              variant: 'on',
              audience: {
                conditions: [
                  {
                    target: 'featureflow.date',
                    operator: 'after',
                    // Note: 'before' and 'after' operators use a single value (first element of array)
                    values: ['2024-01-10T00:00:00.000Z']
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

        waitForInit(featureflow, () => {
          const result = featureflow.evaluate('combined-feature');
          expect(result.value()).toBe('on');
          done();
        });
      });

      it('should return off when one condition fails', (done) => {
        const featureflow = Featureflow.init(FF_KEY, { id: 'test-user' }, createConfigWithFeatures({
          'combined-feature': {
            rules: [{
              variant: 'on',
              audience: {
                conditions: [
                  {
                    target: 'featureflow.date',
                    operator: 'after',
                    // Note: 'before' and 'after' operators use a single value (first element of array)
                    values: ['2024-01-10T00:00:00.000Z']
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

        waitForInit(featureflow, () => {
          const result = featureflow.evaluate('combined-feature');
          expect(result.value()).toBe('off');
          done();
        });
      });
    });

  });
});

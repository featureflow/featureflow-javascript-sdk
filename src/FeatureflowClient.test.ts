import { describe, it, expect, beforeEach } from '@jest/globals';
import Featureflow from './index';
import FeatureflowClient from './FeatureflowClient';
import Evaluate from './Evaluate';

describe('Featureflow', () => {
  const FF_KEY = 'test-api-key';
  
  describe('init', () => {
    it('should initialize Featureflow with API key', () => {
      const featureflow = Featureflow.init(FF_KEY, {}, {
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
      featureflow = Featureflow.init(FF_KEY, {}, {
        offline: true,
        defaultFeatures: {
          'feature-on': 'on',
          'feature-off': 'off',
          'feature-red': 'red'
        }
      });
    });

    it('should return Evaluate instance', () => {
      const result = featureflow.evaluate('feature-on');
      expect(result).toBeInstanceOf(Evaluate);
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
      const featureflow = Featureflow.init(FF_KEY, {}, {
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
      const featureflow = Featureflow.init(FF_KEY, {}, {
        offline: true,
        defaultFeatures: {
          'test-feature': 'on'
        }
      });

      featureflow.on(Featureflow.events.INIT, (features: any) => {
        expect(features).toHaveProperty('test-feature');
        expect(features['test-feature']).toBe('on');
        done();
      });
    });
  });
});

import * as base64 from 'base64-js';
import type { ConfigInternal, FeatureflowUser, EvaluatedFeatures, Features, RequestConfig } from './types';

// Read package.json version at build time
let packageVersion = '2.0.0';
try {
  if (typeof require !== 'undefined') {
    packageVersion = require('../package.json').version;
  }
} catch (e) {
  // Fallback if require is not available
}
const packageJSON = { version: packageVersion };

export default class RestClient {
  baseUrl: string;
  eventsUrl: string;
  apiKey: string;
  timer: ReturnType<typeof setTimeout> | null = null;
  queues: {
    events: any[];
  };

  constructor(apiKey: string, config: ConfigInternal) {
    this.apiKey = apiKey;
    this.baseUrl = config.baseUrl;
    this.eventsUrl = config.eventsUrl;
    this.timer = null;
    this.queues = {
      events: []
    };
  }

  async getFeatures(user: FeatureflowUser, keys: string[] = []): Promise<Features> {
    const query = (keys.length > 0) ? `?keys=${keys.join(',')}` : '';
    return this.request(
      `${this.baseUrl}/api/js/v1/evaluate/${this.apiKey}/user/${encodeURI(this.base64URLEncode(user))}${query}`,
      { method: 'GET' }
    );
  }

  postGoalEvent(user: FeatureflowUser, goalKey: string, evaluatedFeaturesMap: EvaluatedFeatures): void {
    this.flushable();
    this.queues.events.push({
      type: 'goal',
      goalKey,
      impressions: 1,
      evaluatedFeatures: evaluatedFeaturesMap,
      timestamp: new Date(),
      user
    });
  }

  postEvaluateEvent(user: FeatureflowUser, featureKey: string, variant: string): void {
    this.flushable();
    this.queues.events.push({
      type: 'evaluate',
      featureKey,
      evaluatedVariant: variant,
      impressions: 1,
      user,
      timestamp: new Date()
    });
  }

  flush(): void {
    const queue: any[] = [];
    if (this.queues.events.length > 0) {
      queue.push(...this.queues.events);
      this.queues.events = [];
      // Fire and forget - don't wait for response
      this.request(`${this.eventsUrl}/api/js/v1/event/${this.apiKey}`,
        {
          method: 'POST',
          body: queue
        }
      ).catch(() => {
        // Silently handle errors for event flushing
      });
    }
    this.timer = null;
  }

  flushable(): void {
    if (!this.timer) {
      this.timer = setTimeout(this.flush.bind(this), 2000);
    }
  }

  request(endpoint: string, config: RequestConfig): Promise<Features> {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.addEventListener('load', () => {
        if (request.status === 200 && request.getResponseHeader('Content-Type') === "application/json;charset=UTF-8") {
          resolve(JSON.parse(request.responseText));
        } else {
          reject(new Error(request.statusText || 'non 200 response status code'));
        }
      });
      request.addEventListener('error', () => {
        reject(new Error('error connecting with server'));
      });
      request.open(config.method, endpoint);
      request.setRequestHeader('X-Featureflow-Client', `JavascriptClient/${packageJSON.version}`);
      if (config.body) {
        request.setRequestHeader('Content-Type', 'application/json');
        request.send(JSON.stringify(config.body));
      } else {
        request.send();
      }
    });
  }

  base64URLEncode(user: FeatureflowUser): string {
    const jsonString = JSON.stringify(user);
    return base64.fromByteArray(this.stringToBytes(jsonString));
  }

  stringToBytes(s: string): Uint8Array {
    const b: number[] = [];
    for (let i = 0; i < s.length; i++) {
      b.push(s.charCodeAt(i));
    }
    return new Uint8Array(b);
  }
}


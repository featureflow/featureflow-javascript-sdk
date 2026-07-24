import * as base64 from 'base64-js';
import type { ConfigInternal, FeatureflowUser, Features, RequestConfig } from './types';
import type { EventsSendResult } from './EventsSummary';

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

  constructor(apiKey: string, config: ConfigInternal) {
    this.apiKey = apiKey;
    this.baseUrl = config.baseUrl;
    this.eventsUrl = config.eventsUrl;
  }

  async getFeatures(user: FeatureflowUser, keys: string[] = []): Promise<Features> {
    const query = (keys.length > 0) ? `?keys=${keys.join(',')}` : '';
    return this.request(
      `${this.baseUrl}/api/js/v1/evaluate/${this.apiKey}/user/${encodeURI(this.base64URLEncode(user))}${query}`,
      { method: 'GET' }
    );
  }

  private eventsEndpoint(): string {
    return `${this.eventsUrl}/api/js/v1/event/${this.apiKey}`;
  }

  /**
   * POST an event batch and surface the response (status, Retry-After, parsed JSON body) so
   * the caller can react to 401/403/429 and apply the server-driven SDK config carried in
   * the response body. Network errors report status 0.
   */
  postEvents(events: object[], onResponse: (result: EventsSendResult) => void): void {
    const request = new XMLHttpRequest();
    request.addEventListener('load', () => {
      const retryAfter = parseInt(request.getResponseHeader('Retry-After') || '', 10);
      let body: unknown;
      try {
        body = request.responseText ? JSON.parse(request.responseText) : undefined;
      } catch (e) {
        body = undefined;
      }
      onResponse({
        status: request.status,
        retryAfterSeconds: retryAfter > 0 ? retryAfter : undefined,
        body
      });
    });
    request.addEventListener('error', () => {
      onResponse({ status: 0 });
    });
    request.open('POST', this.eventsEndpoint());
    request.setRequestHeader('X-Featureflow-Client', `JavascriptClient/${packageJSON.version}`);
    request.setRequestHeader('Content-Type', 'application/json');
    request.send(JSON.stringify(events));
  }

  /**
   * Hand an event batch to navigator.sendBeacon for delivery after the page is hidden or
   * unloading. Returns true if the browser accepted the batch. sendBeacon cannot set
   * headers, but the events endpoint is keyed by the apiKey in the path.
   */
  postEventsBeacon(events: object[]): boolean {
    if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
      return false;
    }
    try {
      const blob = new Blob([JSON.stringify(events)], { type: 'application/json' });
      return navigator.sendBeacon(this.eventsEndpoint(), blob);
    } catch (e) {
      return false;
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

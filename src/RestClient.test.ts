import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import RestClient from './RestClient';
import type { ConfigInternal } from './types';
import type { EventsSendResult } from './EventsSummary';

const config = {
  baseUrl: 'https://app.test',
  eventsUrl: 'https://events.test',
  defaultFeatures: {},
  useCookies: true,
  offline: false,
  delayInit: false,
  disableEvents: false,
  uniqueEvals: true
} as ConfigInternal;

class MockXHR {
  static instances: MockXHR[] = [];
  listeners: { [event: string]: () => void } = {};
  method = '';
  url = '';
  requestHeaders: { [name: string]: string } = {};
  body: string | undefined;
  status = 0;
  responseText = '';
  private responseHeaders: { [name: string]: string } = {};

  constructor() {
    MockXHR.instances.push(this);
  }
  addEventListener(event: string, cb: () => void): void {
    this.listeners[event] = cb;
  }
  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string): void {
    this.requestHeaders[name] = value;
  }
  send(body?: string): void {
    this.body = body;
  }
  getResponseHeader(name: string): string | null {
    return this.responseHeaders[name] ?? null;
  }
  respond(status: number, responseText = '', responseHeaders: { [name: string]: string } = {}): void {
    this.status = status;
    this.responseText = responseText;
    this.responseHeaders = responseHeaders;
    this.listeners['load']();
  }
  fail(): void {
    this.listeners['error']();
  }
}

describe('RestClient events wire', () => {
  const realXHR = global.XMLHttpRequest;
  let client: RestClient;

  beforeEach(() => {
    MockXHR.instances = [];
    (global as any).XMLHttpRequest = MockXHR;
    client = new RestClient('js-env-key', config);
  });

  afterEach(() => {
    global.XMLHttpRequest = realXHR;
    jest.restoreAllMocks();
  });

  describe('postEvents', () => {
    it('POSTs the batch as JSON to the js events endpoint', () => {
      const batch = [
        { featureKey: 'f1', evaluatedVariant: 'on', type: 'evaluate', impressions: 3, user: { id: 'u1' } },
        { type: 'goal', goalKey: 'signup', user: { id: 'u1' }, timestamp: '2026-07-24T00:00:00.000Z' }
      ];
      client.postEvents(batch, () => {});

      const xhr = MockXHR.instances[0];
      expect(xhr.method).toBe('POST');
      expect(xhr.url).toBe('https://events.test/api/js/v1/event/js-env-key');
      expect(xhr.requestHeaders['Content-Type']).toBe('application/json');
      expect(xhr.requestHeaders['X-Featureflow-Client']).toMatch(/^JavascriptClient\//);
      expect(JSON.parse(xhr.body!)).toEqual(batch);
    });

    it('surfaces status, Retry-After and the parsed JSON body', () => {
      let result: EventsSendResult | undefined;
      client.postEvents([], (r) => { result = r; });
      MockXHR.instances[0].respond(429, '{"error":"slow down"}', { 'Retry-After': '30' });

      expect(result).toEqual({ status: 429, retryAfterSeconds: 30, body: { error: 'slow down' } });
    });

    it('omits retryAfterSeconds and body when absent or unparseable', () => {
      let result: EventsSendResult | undefined;
      client.postEvents([], (r) => { result = r; });
      MockXHR.instances[0].respond(200, 'not-json');

      expect(result).toEqual({ status: 200, retryAfterSeconds: undefined, body: undefined });
    });

    it('reports status 0 on network error', () => {
      let result: EventsSendResult | undefined;
      client.postEvents([], (r) => { result = r; });
      MockXHR.instances[0].fail();

      expect(result).toEqual({ status: 0 });
    });
  });

  describe('postEventsBeacon', () => {
    it('returns false when navigator.sendBeacon is unavailable', () => {
      expect(client.postEventsBeacon([{ type: 'goal' }])).toBe(false);
    });

    it('hands the batch to navigator.sendBeacon when available', () => {
      const sendBeacon = jest.fn<(url: string, data?: BodyInit | null) => boolean>().mockReturnValue(true);
      (navigator as any).sendBeacon = sendBeacon;
      try {
        const accepted = client.postEventsBeacon([{ type: 'goal', goalKey: 'g1' }]);
        expect(accepted).toBe(true);
        expect(sendBeacon).toHaveBeenCalledWith(
          'https://events.test/api/js/v1/event/js-env-key',
          expect.any(Blob)
        );
      } finally {
        delete (navigator as any).sendBeacon;
      }
    });
  });
});

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import EventsSummary from './EventsSummary';
import type { EventsSendResult, EventsTransport } from './EventsSummary';

// Mirrors the scenario intent of featureflow-sdk-testbed/gherkin/{events,sdk_config}.feature
// in jest form (the testbed drives the node SDK; this SDK is single-user, so rows always
// carry the current user).

class FakeTransport implements EventsTransport {
  batches: any[][] = [];
  beaconBatches: any[][] = [];
  nextResult: EventsSendResult = { status: 200 };
  beaconAccepts = true;

  send(events: object[], onResponse: (result: EventsSendResult) => void): void {
    this.batches.push(events as any[]);
    onResponse(this.nextResult);
  }

  sendBeacon(events: object[]): boolean {
    this.beaconBatches.push(events as any[]);
    return this.beaconAccepts;
  }
}

const u1 = { id: 'u1' };
const u2 = { id: 'u2' };

describe('EventsSummary', () => {
  let transport: FakeTransport;
  let events: EventsSummary;

  beforeEach(() => {
    transport = new FakeTransport();
    events = new EventsSummary(transport);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('summarisation', () => {
    it('summarises evaluations of the same feature and variant into one entry', () => {
      events.recordEvaluate('f1', 'on', u1);
      events.recordEvaluate('f1', 'on', u1);
      events.recordEvaluate('f1', 'on', u1);

      const pending = events.pendingSummaries();
      expect(pending).toHaveLength(1);
      expect(pending[0]).toMatchObject({ featureKey: 'f1', evaluatedVariant: 'on', impressions: 3, user: u1 });
    });

    it('summarises different variants of the same feature separately', () => {
      events.recordEvaluate('f1', 'on', u1);
      events.recordEvaluate('f1', 'off', u1);

      const pending = events.pendingSummaries();
      expect(pending).toHaveLength(2);
      expect(pending.find(e => e.evaluatedVariant === 'on')?.impressions).toBe(1);
      expect(pending.find(e => e.evaluatedVariant === 'off')?.impressions).toBe(1);
    });

    it('drops summary entries beyond capacity', () => {
      events = new EventsSummary(transport, { summaryCapacity: 2 });
      events.recordEvaluate('f1', 'on', u1);
      events.recordEvaluate('f2', 'on', u1);
      events.recordEvaluate('f3', 'on', u1);

      expect(events.pendingSummaries()).toHaveLength(2);
    });

    it('still counts impressions for existing entries while at capacity', () => {
      events = new EventsSummary(transport, { summaryCapacity: 1 });
      events.recordEvaluate('f1', 'on', u1);
      events.recordEvaluate('f2', 'on', u1);
      events.recordEvaluate('f1', 'on', u1);

      const pending = events.pendingSummaries();
      expect(pending).toHaveLength(1);
      expect(pending[0]).toMatchObject({ featureKey: 'f1', evaluatedVariant: 'on', impressions: 2 });
    });
  });

  describe('flush wire shape', () => {
    it('flushes one row per (featureKey, variant) with summed impressions and the user attached', () => {
      events.recordEvaluate('f1', 'on', u1);
      events.recordEvaluate('f1', 'on', u1);
      events.recordEvaluate('f2', 'off', u1);
      events.flush();

      expect(transport.batches).toHaveLength(1);
      const batch = transport.batches[0];
      expect(batch).toHaveLength(2);
      expect(batch).toContainEqual({ featureKey: 'f1', evaluatedVariant: 'on', type: 'evaluate', impressions: 2, user: u1 });
      expect(batch).toContainEqual({ featureKey: 'f2', evaluatedVariant: 'off', type: 'evaluate', impressions: 1, user: u1 });
      expect(events.pendingSummaries()).toHaveLength(0);
    });

    it('keeps rows recorded for different users separate', () => {
      events.recordEvaluate('f1', 'on', u1);
      events.recordEvaluate('f1', 'on', u2);
      events.flush();

      const batch = transport.batches[0];
      expect(batch).toHaveLength(2);
      expect(batch).toContainEqual(expect.objectContaining({ impressions: 1, user: u1 }));
      expect(batch).toContainEqual(expect.objectContaining({ impressions: 1, user: u2 }));
    });

    it('does not flush when nothing is pending', () => {
      events.flush();
      expect(transport.batches).toHaveLength(0);
    });
  });

  describe('goals', () => {
    it('sends goal rows raw with the OpenFeature-shaped details, never summarised', () => {
      events.recordGoal('signup', u1, 42);
      events.recordGoal('signup', u1, { value: 7, plan: 'pro' });
      events.recordGoal('signup', u1);
      events.flush();

      const batch = transport.batches[0];
      expect(batch).toHaveLength(3);
      expect(batch[0]).toMatchObject({ type: 'goal', goalKey: 'signup', user: u1, value: 42 });
      expect(batch[0].timestamp).toEqual(expect.any(String));
      expect(batch[1]).toMatchObject({ type: 'goal', goalKey: 'signup', user: u1, value: 7, data: { plan: 'pro' } });
      expect(batch[2]).not.toHaveProperty('value');
      expect(batch[2]).not.toHaveProperty('data');
      // The legacy full-flag-map payload is gone from the wire.
      expect(batch[2]).not.toHaveProperty('evaluatedFeatures');
    });

    it('drops goals beyond capacity', () => {
      events = new EventsSummary(transport, { goalsCapacity: 2 });
      events.recordGoal('g1', u1);
      events.recordGoal('g2', u1);
      events.recordGoal('g3', u1);
      expect(events.pendingGoals()).toHaveLength(2);
    });

    it('flushes goals in the same batch as evaluate summaries', () => {
      events.recordEvaluate('f1', 'on', u1);
      events.recordGoal('signup', u1);
      events.flush();

      const batch = transport.batches[0];
      expect(batch).toHaveLength(2);
      expect(batch.map((e: any) => e.type).sort()).toEqual(['evaluate', 'goal']);
    });
  });

  describe('server signals (phase-0 parity)', () => {
    it.each([401, 403])('a %d response permanently disables event sending', (status) => {
      transport.nextResult = { status };
      events.recordEvaluate('f1', 'on', u1);
      events.flush();

      expect(events.disabled).toBe(true);
      expect(events.pendingSummaries()).toHaveLength(0);
      events.recordEvaluate('f1', 'on', u1);
      events.recordGoal('g1', u1);
      expect(events.pendingSummaries()).toHaveLength(0);
      expect(events.pendingGoals()).toHaveLength(0);
      events.flush();
      expect(transport.batches).toHaveLength(1);
    });

    it('a 429 response requeues the batch, merges impressions and backs off Retry-After seconds', () => {
      jest.useFakeTimers().setSystemTime(0);
      transport.nextResult = { status: 429, retryAfterSeconds: 30 };
      events.recordEvaluate('f1', 'on', u1);
      events.flush();

      // Rejected batch is merged back with anything recorded since.
      events.recordEvaluate('f1', 'on', u1);
      expect(events.pendingSummaries()[0].impressions).toBe(2);

      // No sends while backing off.
      events.flush();
      expect(transport.batches).toHaveLength(1);

      // After the backoff expires the retained batch is sent.
      transport.nextResult = { status: 200 };
      jest.setSystemTime(31 * 1000);
      events.flush();
      expect(transport.batches).toHaveLength(2);
      expect(transport.batches[1][0]).toMatchObject({ featureKey: 'f1', impressions: 2 });
    });

    it('a 429 response requeues goals too', () => {
      transport.nextResult = { status: 429 };
      events.recordGoal('g1', u1);
      events.flush();
      expect(events.pendingGoals()).toHaveLength(1);
    });

    it('a 429 response without Retry-After backs off for the default 60 seconds', () => {
      jest.useFakeTimers().setSystemTime(0);
      transport.nextResult = { status: 429 };
      events.recordEvaluate('f1', 'on', u1);
      events.flush();
      expect(events.backoffUntil).toBe(60 * 1000);
    });

    it('a network error drops the batch without disabling', () => {
      transport.nextResult = { status: 0 };
      events.recordEvaluate('f1', 'on', u1);
      events.flush();
      expect(events.disabled).toBe(false);
      events.recordEvaluate('f1', 'on', u1);
      expect(events.pendingSummaries()).toHaveLength(1);
    });
  });

  describe('server-driven config', () => {
    it('eventsEnabled false suspends recording and clears pending events', () => {
      events.recordEvaluate('f1', 'on', u1);
      events.recordGoal('g1', u1);
      events.applyServerConfig({ eventsEnabled: false });

      expect(events.pendingSummaries()).toHaveLength(0);
      expect(events.pendingGoals()).toHaveLength(0);
      events.recordEvaluate('f1', 'on', u1);
      expect(events.pendingSummaries()).toHaveLength(0);
    });

    it('eventsEnabled true resumes recording', () => {
      events.applyServerConfig({ eventsEnabled: false });
      events.recordEvaluate('f1', 'on', u1);
      events.applyServerConfig({ eventsEnabled: true });
      events.recordEvaluate('f1', 'on', u1);
      expect(events.pendingSummaries()).toHaveLength(1);
    });

    it('mode off stops event recording', () => {
      events.applyServerConfig({ mode: 'off' });
      events.recordEvaluate('f1', 'on', u1);
      events.recordGoal('g1', u1);
      expect(events.pendingSummaries()).toHaveLength(0);
      expect(events.pendingGoals()).toHaveLength(0);
    });

    it('mode full records one entry per evaluation with the user on every entry', () => {
      events.applyServerConfig({ mode: 'full' });
      events.recordEvaluate('f1', 'on', u1);
      events.recordEvaluate('f1', 'on', u1);

      const pending = events.pendingSummaries();
      expect(pending).toHaveLength(2);
      for (const entry of pending) {
        expect(entry).toMatchObject({ featureKey: 'f1', evaluatedVariant: 'on', impressions: 1, user: u1 });
      }
    });

    it('flushIntervalSeconds restarts the flush timer', () => {
      jest.useFakeTimers();
      events.recordEvaluate('f1', 'on', u1);
      events.applyServerConfig({ flushIntervalSeconds: 30 });
      expect(events.getFlushIntervalMs()).toBe(30 * 1000);

      // The pending flush is rescheduled onto the new interval.
      jest.advanceTimersByTime(29 * 1000);
      expect(transport.batches).toHaveLength(0);
      jest.advanceTimersByTime(1000);
      expect(transport.batches).toHaveLength(1);
    });

    it('ignores invalid config values field by field', () => {
      events.applyServerConfig({ eventsEnabled: 'yes', mode: 'banana', flushIntervalSeconds: -5 });
      expect(events.suspended).toBe(false);
      expect(events.mode).toBe('summary');
      expect(events.getFlushIntervalMs()).toBe(2000);

      events.applyServerConfig({ flushIntervalSeconds: 4000 });
      expect(events.getFlushIntervalMs()).toBe(2000);
    });

    it('ignores unknown and not-applicable fields (streamEnabled, streamUrl, pollIntervalSeconds)', () => {
      events.applyServerConfig({
        eventsEnabled: true,
        mode: 'summary',
        flushIntervalSeconds: 60,
        pollIntervalSeconds: 20,
        streamEnabled: true,
        streamUrl: 'https://stream.featureflow.io'
      });
      expect(events.suspended).toBe(false);
      expect(events.mode).toBe('summary');
      expect(events.getFlushIntervalMs()).toBe(60 * 1000);
    });

    it('ignores a malformed config entirely', () => {
      events.applyServerConfig('not-json-object');
      events.applyServerConfig(null);
      expect(events.suspended).toBe(false);
      expect(events.mode).toBe('summary');
      expect(events.getFlushIntervalMs()).toBe(2000);
    });

    it('never re-enables a locally disabled client', () => {
      events = new EventsSummary(transport, { disabled: true });
      events.applyServerConfig({ eventsEnabled: true });
      events.recordEvaluate('f1', 'on', u1);
      expect(events.pendingSummaries()).toHaveLength(0);
      events.flush();
      expect(transport.batches).toHaveLength(0);
    });

    it('applies the config carried in the events response body on flush', () => {
      transport.nextResult = { status: 200, body: { eventsEnabled: false, mode: 'summary', flushIntervalSeconds: 120 } };
      events.recordEvaluate('f1', 'on', u1);
      events.flush();

      expect(events.suspended).toBe(true);
      expect(events.getFlushIntervalMs()).toBe(120 * 1000);
    });
  });

  describe('timer and page-exit flush', () => {
    it('flushes on the interval timer once events are recorded', () => {
      jest.useFakeTimers();
      events.recordEvaluate('f1', 'on', u1);
      expect(transport.batches).toHaveLength(0);
      jest.advanceTimersByTime(2000);
      expect(transport.batches).toHaveLength(1);
    });

    it('uses the beacon transport for a page-exit flush', () => {
      events.recordEvaluate('f1', 'on', u1);
      events.flush(true);

      expect(transport.beaconBatches).toHaveLength(1);
      expect(transport.batches).toHaveLength(0);
      expect(transport.beaconBatches[0][0]).toMatchObject({ featureKey: 'f1', impressions: 1 });
    });

    it('falls back to the async transport when the beacon is rejected', () => {
      transport.beaconAccepts = false;
      events.recordEvaluate('f1', 'on', u1);
      events.flush(true);

      expect(transport.beaconBatches).toHaveLength(1);
      expect(transport.batches).toHaveLength(1);
    });
  });
});

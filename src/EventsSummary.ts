import type { FeatureflowUser, GoalDetails } from './types';

// Separator for the (featureKey, evaluatedVariant, userId) summary key; the
// (featureKey, evaluatedVariant) grouping matches sdk-server's eventSummariser. The user id
// is part of the key so impressions recorded either side of updateUser() during a 429
// backoff never merge under the wrong user.
const KEY_SEPARATOR = '\x1f';

export type SdkEventsMode = 'summary' | 'full' | 'off';

export type EventsSendResult = {
  /** HTTP status code, or 0 for a network error. */
  status: number;
  retryAfterSeconds?: number;
  /** Parsed JSON response body, if any — carries the server-driven SDK config. */
  body?: unknown;
};

/**
 * Transport injected by the client. EventsSummary itself has no DOM or XHR dependencies so
 * it can lift into a shared core package if the JS SDKs are consolidated.
 */
export type EventsTransport = {
  /** Async POST of the batch. Must invoke onResponse (status 0 on network error). */
  send(events: object[], onResponse: (result: EventsSendResult) => void): void;
  /**
   * Best-effort fire-and-forget hand-off for page exit (navigator.sendBeacon). Returns true
   * if the batch was handed off to the browser for delivery.
   */
  sendBeacon?(events: object[]): boolean;
};

export type EventsSummaryOptions = {
  /** Local disable — permanent for the client's lifetime; server config can never override it. */
  disabled?: boolean;
  flushIntervalMs?: number;
  summaryCapacity?: number;
  goalsCapacity?: number;
};

type SummaryEntry = {
  featureKey: string;
  evaluatedVariant: string;
  impressions: number;
  user: FeatureflowUser;
};

type GoalEvent = {
  type: 'goal';
  goalKey: string;
  timestamp: string;
  user: FeatureflowUser;
  value?: number;
  data?: { [key: string]: unknown };
};

const DEFAULT_FLUSH_INTERVAL_MS = 2000;
const MIN_FLUSH_INTERVAL_SECONDS = 1;
const MAX_FLUSH_INTERVAL_SECONDS = 3600;
const SUMMARY_CAPACITY = 10000;
const GOALS_CAPACITY = 10000;
const DEFAULT_RETRY_AFTER_SECONDS = 60;

/**
 * Client-side event summarisation per the server-driven SDK config contract
 * (featureflow-node-sdk/testbed/SDK-CONFIG.md, "summary" mode). Evaluate events are kept as
 * one pending entry per (featureKey, variant) with an impression count; because the browser
 * SDK has a single current user, every summary row carries that user, so summarised rows
 * already hold complete (user, flag, variant) assignment data. Goals are raw, never
 * summarised. The events response body is the server config channel.
 */
export default class EventsSummary {
  private transport: EventsTransport;
  private summaries: Map<string, SummaryEntry> = new Map();
  private goals: GoalEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private flushIntervalMs: number;
  private summaryCapacity: number;
  private goalsCapacity: number;
  // Unique map keys for full-mode entries, where events must not merge.
  private fullModeCounter = 0;

  /** Permanently disabled: local config, or a 401/403 from the events endpoint. */
  disabled: boolean;
  /** Reversibly suspended by server config (eventsEnabled: false). */
  suspended = false;
  mode: SdkEventsMode = 'summary';
  backoffUntil = 0;

  constructor(transport: EventsTransport, options: EventsSummaryOptions = {}) {
    this.transport = transport;
    this.disabled = !!options.disabled;
    this.flushIntervalMs = options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;
    this.summaryCapacity = options.summaryCapacity ?? SUMMARY_CAPACITY;
    this.goalsCapacity = options.goalsCapacity ?? GOALS_CAPACITY;
  }

  recordEvaluate(featureKey: string, evaluatedVariant: string, user: FeatureflowUser): void {
    if (this.disabled || this.suspended || this.mode === 'off') {
      return;
    }
    // In full mode every evaluation is its own entry (unique key, one impression) — the raw
    // pre-summarisation wire shape, selectable by server config.
    const key = this.mode === 'full'
      ? String(this.fullModeCounter++)
      : featureKey + KEY_SEPARATOR + evaluatedVariant + KEY_SEPARATOR + user.id;
    let entry = this.summaries.get(key);
    if (!entry) {
      if (this.summaries.size >= this.summaryCapacity) {
        return;
      }
      entry = { featureKey, evaluatedVariant, impressions: 0, user };
      this.summaries.set(key, entry);
    }
    entry.impressions++;
    this.schedule();
  }

  /**
   * Record a goal (track) event: `{ type: 'goal', goalKey, user, value?, data?, timestamp }`.
   * `details` may be a number (the metric value) or an object whose optional `value` is the
   * metric value and whose remaining fields are sent as `data` — mirroring the OpenFeature
   * tracking API. Goals are sent raw (no summarisation): analysis joins them against
   * exposures on the user id.
   */
  recordGoal(goalKey: string, user: FeatureflowUser, details?: GoalDetails): void {
    if (this.disabled || this.suspended || this.mode === 'off' || !goalKey) {
      return;
    }
    if (this.goals.length >= this.goalsCapacity) {
      return;
    }
    const event: GoalEvent = {
      type: 'goal',
      goalKey,
      timestamp: new Date().toISOString(),
      user
    };
    if (typeof details === 'number') {
      event.value = details;
    } else if (details != null && typeof details === 'object') {
      if (typeof details.value === 'number') {
        event.value = details.value;
      }
      const data: { [key: string]: unknown } = {};
      let hasData = false;
      for (const key in details) {
        if (key !== 'value' && Object.prototype.hasOwnProperty.call(details, key)) {
          data[key] = (details as { [key: string]: unknown })[key];
          hasData = true;
        }
      }
      if (hasData) {
        event.data = data;
      }
    }
    this.goals.push(event);
    this.schedule();
  }

  /**
   * Flush pending events. `exit` uses the beacon transport (page is being hidden/unloaded);
   * otherwise the async transport, whose response drives 401/403/429 handling and server
   * config. Called by the flush timer, on updateUser (rows carry one user each), and from
   * the page-exit hooks.
   */
  flush(exit = false): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.disabled || this.suspended || this.mode === 'off') {
      return;
    }
    if (this.summaries.size === 0 && this.goals.length === 0) {
      return;
    }
    if (Date.now() < this.backoffUntil) {
      return;
    }
    const sentSummaries = this.summaries;
    const sentGoals = this.goals;
    this.summaries = new Map();
    this.goals = [];

    const batch: object[] = this.buildBatch(sentSummaries).concat(sentGoals);
    if (exit && this.transport.sendBeacon && this.transport.sendBeacon(batch)) {
      return;
    }
    this.transport.send(batch, (result) => {
      if (result.status === 401 || result.status === 403) {
        // The API key is not authorized — disable event sending for the client's lifetime.
        this.disable();
        return;
      }
      if (result.status === 429) {
        this.backoffUntil = Date.now() + (result.retryAfterSeconds || DEFAULT_RETRY_AFTER_SECONDS) * 1000;
        this.requeue(sentSummaries);
        this.goals = sentGoals.concat(this.goals).slice(0, this.goalsCapacity);
        return;
      }
      if (result.status === 200) {
        // The events response body carries the server-driven SDK config.
        this.applyServerConfig(result.body);
      }
    });
  }

  /**
   * Apply server-driven config `{ eventsEnabled, mode, flushIntervalSeconds }` from the
   * events response body. Absent fields keep their current value; invalid values are ignored
   * field by field; unknown fields (including the reserved streamEnabled/streamUrl and the
   * not-applicable pollIntervalSeconds) are ignored. A local disable is never overridden.
   */
  applyServerConfig(config: unknown): void {
    if (this.disabled || config == null || typeof config !== 'object') {
      return;
    }
    const c = config as { [key: string]: unknown };
    if (typeof c.eventsEnabled === 'boolean') {
      this.setSuspended(!c.eventsEnabled);
    }
    if (c.mode === 'summary' || c.mode === 'full' || c.mode === 'off') {
      this.mode = c.mode;
    }
    const seconds = c.flushIntervalSeconds;
    if (
      typeof seconds === 'number' &&
      seconds >= MIN_FLUSH_INTERVAL_SECONDS &&
      seconds <= MAX_FLUSH_INTERVAL_SECONDS
    ) {
      this.setFlushInterval(seconds * 1000);
    }
  }

  getFlushIntervalMs(): number {
    return this.flushIntervalMs;
  }

  /** Pending (featureKey, variant) → impressions entries; exposed for tests/debugging. */
  pendingSummaries(): { featureKey: string; evaluatedVariant: string; impressions: number; user: FeatureflowUser }[] {
    return Array.from(this.summaries.values());
  }

  pendingGoals(): GoalEvent[] {
    return this.goals.slice();
  }

  private setSuspended(suspended: boolean): void {
    if (suspended && !this.suspended) {
      // Suspension drops pending events and stops recording until re-enabled.
      this.summaries = new Map();
      this.goals = [];
    }
    this.suspended = suspended;
  }

  private setFlushInterval(ms: number): void {
    if (ms === this.flushIntervalMs) {
      return;
    }
    this.flushIntervalMs = ms;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      this.schedule();
    }
  }

  private schedule(): void {
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.flush();
      }, this.flushIntervalMs);
    }
  }

  // One wire row per summary entry: {featureKey, evaluatedVariant, type:'evaluate',
  // impressions, user} — same shape as the node SDK's summarised batch.
  private buildBatch(summaries: Map<string, SummaryEntry>): object[] {
    const events: object[] = [];
    summaries.forEach((entry) => {
      events.push({
        featureKey: entry.featureKey,
        evaluatedVariant: entry.evaluatedVariant,
        type: 'evaluate',
        impressions: entry.impressions,
        user: entry.user
      });
    });
    return events;
  }

  // Merge a 429-rejected batch back over anything summarised since, dropping the newest
  // entries if the combined summary exceeds capacity.
  private requeue(sentSummaries: Map<string, SummaryEntry>): void {
    this.summaries.forEach((entry, key) => {
      const rejected = sentSummaries.get(key);
      if (rejected) {
        rejected.impressions += entry.impressions;
      } else if (sentSummaries.size < this.summaryCapacity) {
        sentSummaries.set(key, entry);
      }
    });
    this.summaries = sentSummaries;
  }

  private disable(): void {
    this.disabled = true;
    this.summaries = new Map();
    this.goals = [];
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

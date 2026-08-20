import type { EvaluationDetails, EvaluationListener } from './types';

/**
 * The subset of the Amplitude browser SDK this integration calls, duck-typed so
 * `@amplitude/unified`, `@amplitude/analytics-browser` or any wrapper with the same
 * surface all work — the SDK takes the customer's own instance and adds no dependency.
 * Routing through their instance is the point: exposure events carry their user/device
 * identity, so no id mapping between Featureflow and Amplitude is ever needed.
 */
export type AmplitudeLike = {
  track: (eventName: string, eventProperties?: Record<string, unknown>) => unknown;
  identify?: (identify: unknown) => unknown;
  Identify?: new () => { set(key: string, value: unknown): unknown };
};

export type AmplitudeIntegrationOptions = {
  /**
   * Also set a `featureflow_<flagKey>` user property via Amplitude's Identify API, so
   * every event the user sends afterwards can be segmented by variant — not just the
   * exposure itself. Default true; ignored if the instance has no Identify API.
   */
  identify?: boolean;
  /** Event name to send. Default `$exposure`, which Amplitude Experiment reads natively. */
  eventName?: string;
};

// Cleared wholesale if it somehow grows past this — same shape as EventsSummary's cap.
// A page evaluating 10k distinct (user, flag, variant) triples is not a real page.
const DEDUPE_CAPACITY = 10000;

/**
 * Sends flag evaluations to Amplitude as `$exposure` events for A/B analysis:
 *
 * ```js
 * import Featureflow, { amplitudeIntegration } from 'featureflow-client';
 * import * as amplitude from '@amplitude/unified';
 *
 * const client = await Featureflow.init('js-env-...', {
 *   integrations: [amplitudeIntegration(amplitude)]
 * });
 * ```
 *
 * Exposures are deduped per (user, flag, variant) for the page's lifetime — evaluate()
 * runs on every render in component code, and each Amplitude event is billed volume. A
 * variant or user change sends again, which is exactly when the analysis needs a fresh
 * exposure.
 */
export function amplitudeIntegration(
  amplitude: AmplitudeLike,
  options: AmplitudeIntegrationOptions = {}
): EvaluationListener {
  const eventName = options.eventName || '$exposure';
  const identify = options.identify !== false;
  const seen = new Set<string>();

  return ({ key, variant, user }: EvaluationDetails) => {
    const dedupeKey = `${user?.id ?? ''}\x1f${key}\x1f${variant}`;
    if (seen.has(dedupeKey)) {
      return;
    }
    if (seen.size >= DEDUPE_CAPACITY) {
      seen.clear();
    }
    seen.add(dedupeKey);

    amplitude.track(eventName, { flag_key: key, variant });

    if (identify && amplitude.identify && amplitude.Identify) {
      const identifyEvent = new amplitude.Identify();
      identifyEvent.set(`featureflow_${key}`, variant);
      amplitude.identify(identifyEvent);
    }
  };
}

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
  // `any` on purpose: function parameters are contravariant, so `unknown` here would
  // reject the real Amplitude SDKs — their identify() accepts their own IIdentify type,
  // and Identify.set() their own ValidPropertyType, neither of which accepts `unknown`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  identify?: (identify: any) => unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Identify?: new () => { set(key: string, value: any): unknown };
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
  /**
   * Which flags send exposures. Most flags are operational — kill switches, infra
   * toggles — and every exposure is billed Amplitude volume plus a user-property slot,
   * so teams running experiments usually want only those flags here.
   *
   * An array of exact flag keys, or a predicate for naming conventions and anything
   * else, e.g. `(key) => key.startsWith('exp-')`. Omitted sends every flag; `[]` sends
   * none. Gates both the exposure event and the Identify user property.
   */
  flags?: string[] | ((key: string) => boolean);
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
  const flags = options.flags;
  // Normalised once to a predicate: an array is exact keys (as a Set — this runs on every
  // evaluate() call), a function is the caller's own rule, absence means every flag.
  const allowedKeys = Array.isArray(flags) ? new Set(flags) : undefined;
  const matchesFlags: (key: string) => boolean =
    flags === undefined ? () => true : allowedKeys ? (key) => allowedKeys.has(key) : (flags as (key: string) => boolean);
  const seen = new Set<string>();

  return ({ key, variant, user }: EvaluationDetails) => {
    // Filtered keys return before the dedupe set, so unsent flags cost no memory either.
    if (!matchesFlags(key)) {
      return;
    }
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

import type { EvaluationDetails, EvaluationListener } from './types';

/**
 * Which flags an integration sends. Most flags are operational — kill switches, infra
 * toggles — and every exposure is billed event volume in the analytics tool, so teams
 * running experiments usually want only those flags here.
 *
 * An array of exact flag keys, or a predicate for naming conventions and anything else,
 * e.g. `(key) => key.startsWith('exp-')`. Omitted sends every flag; `[]` sends none.
 */
export type FlagFilter = string[] | ((key: string) => boolean);

export type ExposureIntegrationOptions = {
  /** Which flags send exposures. See {@link FlagFilter}. */
  flags?: FlagFilter;
};

/**
 * Called once per new (user, flag, variant) with the evaluation details — this is
 * where the tool-specific event goes.
 */
export type ExposureSender = (exposure: EvaluationDetails) => void;

// Cleared wholesale if it somehow grows past this — same shape as EventsSummary's cap.
// A page evaluating 10k distinct (user, flag, variant) triples is not a real page.
const DEDUPE_CAPACITY = 10000;

function flagPredicate(flags: FlagFilter | undefined): (key: string) => boolean {
  if (flags === undefined) {
    return () => true;
  }
  if (Array.isArray(flags)) {
    // A Set — this runs on every evaluate() call.
    const allowed = new Set(flags);
    return (key) => allowed.has(key);
  }
  return flags;
}

/**
 * Builds an analytics integration for any tool: `send` is called once per new
 * (user, flag, variant) with the evaluation details, and you write the event in
 * whatever shape your tool expects.
 *
 * ```js
 * import Featureflow, { exposureIntegration } from 'featureflow-client';
 *
 * const client = await Featureflow.init('js-env-...', {
 *   integrations: [
 *     exposureIntegration(({ key, variant }) => {
 *       mixpanel.track('$experiment_started', { 'Experiment name': key, 'Variant name': variant });
 *     }, { flags: (key) => key.startsWith('exp-') })
 *   ]
 * });
 * ```
 *
 * Exposures are deduped per (user, flag, variant) for the page's lifetime — evaluate()
 * runs on every render in component code, and each analytics event is billed volume. A
 * variant or user change sends again, which is exactly when the analysis needs a fresh
 * exposure. Filtered flags return before the dedupe set, so unsent flags cost no memory.
 */
export function exposureIntegration(send: ExposureSender, options: ExposureIntegrationOptions = {}): EvaluationListener {
  const matchesFlags = flagPredicate(options.flags);
  const seen = new Set<string>();

  return (exposure: EvaluationDetails) => {
    const { key, variant, user } = exposure;
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
    send(exposure);
  };
}

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

export type AmplitudeIntegrationOptions = ExposureIntegrationOptions & {
  /**
   * Also set a `featureflow_<flagKey>` user property via Amplitude's Identify API, so
   * every event the user sends afterwards can be segmented by variant — not just the
   * exposure itself. Default true; ignored if the instance has no Identify API.
   */
  identify?: boolean;
  /** Event name to send. Default `$exposure`, which Amplitude Experiment reads natively. */
  eventName?: string;
};

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
 * Built on {@link exposureIntegration}, so exposures are deduped per (user, flag,
 * variant) and `flags` limits which flags send. The `flags` filter gates both the
 * exposure event and the Identify user property.
 */
export function amplitudeIntegration(
  amplitude: AmplitudeLike,
  options: AmplitudeIntegrationOptions = {}
): EvaluationListener {
  const eventName = options.eventName || '$exposure';
  const identify = options.identify !== false;

  return exposureIntegration(
    ({ key, variant }) => {
      amplitude.track(eventName, { flag_key: key, variant });

      if (identify && amplitude.identify && amplitude.Identify) {
        const identifyEvent = new amplitude.Identify();
        identifyEvent.set(`featureflow_${key}`, variant);
        amplitude.identify(identifyEvent);
      }
    },
    { flags: options.flags }
  );
}

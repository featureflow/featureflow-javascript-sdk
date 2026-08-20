export const LOADED = 'LOADED';
export const LOADED_FROM_CACHE = 'LOADED_FROM_CACHE';
export const ERROR = 'ERROR';
export const INIT = 'INIT';
/** Fired synchronously on every evaluate(key) call with EvaluationDetails — the hook
 *  analytics integrations attach to. evaluateAll() deliberately does not fire it. */
export const EVALUATION = 'EVALUATION';

export default {
  INIT,
  LOADED,
  LOADED_FROM_CACHE,
  ERROR,
  EVALUATION
};


// Contract slug (featureflow-client-sdk-testbed/CONTRACT.md): lowercase [a-z0-9._-],
// max 64 chars. The server sanitises defensively; the SDK validates strictly so a typo
// is a visible warning here rather than a silently mangled tag there.
const APPLICATION_PATTERN = /^[a-z0-9._-]{1,64}$/;

/**
 * Validate the configured application tag (a site/app label for the browser SDK, e.g.
 * 'web-app'). Case is forgiven (lowercased); anything else invalid is dropped with a
 * warning and no tag is sent.
 */
export function sanitiseApplication(raw: unknown): string | undefined {
  if (raw == null || raw === '') {
    return undefined;
  }
  if (typeof raw !== 'string') {
    console.warn('[featureflow] ignoring application — must be a string');
    return undefined;
  }
  const value = raw.trim().toLowerCase();
  if (!APPLICATION_PATTERN.test(value)) {
    console.warn(
      `[featureflow] ignoring application "${raw}" — must be lowercase a-z, 0-9, dot, underscore or hyphen, max 64 chars`
    );
    return undefined;
  }
  return value;
}

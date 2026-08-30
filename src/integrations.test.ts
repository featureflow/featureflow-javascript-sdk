import { describe, it, expect, jest } from '@jest/globals';
import Featureflow from './index';
import { amplitudeIntegration, exposureIntegration } from './integrations';
import type { AmplitudeLike } from './integrations';
import type { EvaluationDetails } from './types';
import { EVALUATION } from './Events';

const FF_KEY = 'test-api-key';

/** Offline client with fixed variants — evaluation is synchronous and deterministic. */
function client(integrations?: Array<(details: EvaluationDetails) => void>) {
  return Featureflow.init(FF_KEY, { id: 'user-1' }, {
    offline: true,
    defaultFeatures: { 'checkout-v2': 'on', 'other-flag': 'off' },
    integrations
  });
}

function fakeAmplitude() {
  const identifySets: Array<[string, unknown]> = [];
  const amplitude = {
    track: jest.fn(),
    identify: jest.fn(),
    Identify: class {
      set(key: string, value: unknown) {
        identifySets.push([key, value]);
        return this;
      }
    }
  } as unknown as AmplitudeLike & { track: jest.Mock; identify: jest.Mock };
  return { amplitude, identifySets };
}

describe('EVALUATION event', () => {
  it('fires on every evaluate(key) with the key, variant and user', async () => {
    const ff = await client();
    const received: EvaluationDetails[] = [];
    ff.on(EVALUATION, (details: EvaluationDetails) => received.push(details));

    ff.evaluate('checkout-v2');

    expect(received).toHaveLength(1);
    expect(received[0].key).toBe('checkout-v2');
    expect(received[0].variant).toBe('on');
    expect(received[0].user.id).toBe('user-1');
  });

  it('fires for unknown keys, which evaluate to off', async () => {
    const ff = await client();
    const received: EvaluationDetails[] = [];
    ff.on(EVALUATION, (details: EvaluationDetails) => received.push(details));

    ff.evaluate('no-such-flag');

    expect(received).toEqual([expect.objectContaining({ key: 'no-such-flag', variant: 'off' })]);
  });

  it('a throwing listener does not break evaluation', async () => {
    const ff = await client();
    ff.on(EVALUATION, () => {
      throw new Error('broken listener');
    });

    expect(ff.evaluate('checkout-v2').value()).toBe('on');
  });
});

describe('Config.integrations', () => {
  it('wires listeners at init and isolates a throwing integration from the others', async () => {
    const received: string[] = [];
    const ff = await client([
      () => {
        throw new Error('broken integration');
      },
      ({ key }) => received.push(key)
    ]);

    expect(ff.evaluate('checkout-v2').value()).toBe('on');
    // The second integration still ran despite the first throwing.
    expect(received).toEqual(['checkout-v2']);
  });
});

describe('exposureIntegration', () => {
  it('calls send with the full evaluation details on the first exposure', async () => {
    const send = jest.fn();
    const ff = await client([exposureIntegration(send)]);

    ff.evaluate('checkout-v2');

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'checkout-v2', variant: 'on', user: expect.objectContaining({ id: 'user-1' }) })
    );
  });

  it('dedupes repeat exposures of the same (user, flag, variant)', async () => {
    const send = jest.fn();
    const ff = await client([exposureIntegration(send)]);

    ff.evaluate('checkout-v2');
    ff.evaluate('checkout-v2');
    ff.evaluate('checkout-v2');

    expect(send).toHaveBeenCalledTimes(1);
  });

  it('sends again when the variant, flag or user differs', () => {
    const send = jest.fn();
    const integration = exposureIntegration(send);
    const user = { id: 'user-1' };

    integration({ key: 'checkout-v2', variant: 'on', user });
    integration({ key: 'checkout-v2', variant: 'off', user });
    integration({ key: 'other-flag', variant: 'on', user });
    integration({ key: 'checkout-v2', variant: 'on', user: { id: 'user-2' } });

    expect(send).toHaveBeenCalledTimes(4);
  });

  it('flags array: only listed flags reach send', async () => {
    const send = jest.fn();
    const ff = await client([exposureIntegration(send, { flags: ['checkout-v2'] })]);

    ff.evaluate('checkout-v2');
    ff.evaluate('other-flag');

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ key: 'checkout-v2' }));
  });

  it('flags predicate: naming conventions work without any pattern syntax', () => {
    const send = jest.fn();
    const integration = exposureIntegration(send, { flags: (key) => key.startsWith('exp-') });
    const user = { id: 'user-1' };

    integration({ key: 'exp-pricing', variant: 'b', user });
    integration({ key: 'kill-switch', variant: 'on', user });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ key: 'exp-pricing', variant: 'b' }));
  });

  it('flags: [] sends nothing — an allowlist is an allowlist', async () => {
    const send = jest.fn();
    const ff = await client([exposureIntegration(send, { flags: [] })]);

    ff.evaluate('checkout-v2');

    expect(send).not.toHaveBeenCalled();
  });

  it('a throwing send is isolated by the client like any other integration', async () => {
    const ff = await client([
      exposureIntegration(() => {
        throw new Error('analytics down');
      })
    ]);

    expect(ff.evaluate('checkout-v2').value()).toBe('on');
  });
});

describe('amplitudeIntegration', () => {
  it('sends $exposure with flag_key and variant, and identifies featureflow_<key>', async () => {
    const { amplitude, identifySets } = fakeAmplitude();
    const ff = await client([amplitudeIntegration(amplitude)]);

    ff.evaluate('checkout-v2');

    expect(amplitude.track).toHaveBeenCalledWith('$exposure', { flag_key: 'checkout-v2', variant: 'on' });
    expect(amplitude.identify).toHaveBeenCalledTimes(1);
    expect(identifySets).toEqual([['featureflow_checkout-v2', 'on']]);
  });

  it('dedupes repeat exposures of the same (user, flag, variant)', async () => {
    const { amplitude } = fakeAmplitude();
    const ff = await client([amplitudeIntegration(amplitude)]);

    ff.evaluate('checkout-v2');
    ff.evaluate('checkout-v2');
    ff.evaluate('checkout-v2');

    expect(amplitude.track).toHaveBeenCalledTimes(1);
  });

  it('sends again when the variant or the flag differs', async () => {
    const { amplitude } = fakeAmplitude();
    const integration = amplitudeIntegration(amplitude);
    const user = { id: 'user-1' };

    integration({ key: 'checkout-v2', variant: 'on', user });
    integration({ key: 'checkout-v2', variant: 'off', user });
    integration({ key: 'other-flag', variant: 'on', user });

    expect(amplitude.track).toHaveBeenCalledTimes(3);
  });

  it('sends again for a different user', async () => {
    const { amplitude } = fakeAmplitude();
    const integration = amplitudeIntegration(amplitude);

    integration({ key: 'checkout-v2', variant: 'on', user: { id: 'user-1' } });
    integration({ key: 'checkout-v2', variant: 'on', user: { id: 'user-2' } });

    expect(amplitude.track).toHaveBeenCalledTimes(2);
  });

  it('identify: false sends only the exposure event', async () => {
    const { amplitude } = fakeAmplitude();
    const ff = await client([amplitudeIntegration(amplitude, { identify: false })]);

    ff.evaluate('checkout-v2');

    expect(amplitude.track).toHaveBeenCalledTimes(1);
    expect(amplitude.identify).not.toHaveBeenCalled();
  });

  it('works with an instance that has no Identify API', async () => {
    const track = jest.fn();
    const ff = await client([amplitudeIntegration({ track })]);

    ff.evaluate('checkout-v2');

    expect(track).toHaveBeenCalledWith('$exposure', { flag_key: 'checkout-v2', variant: 'on' });
  });

  it('flags array: only listed flags send an exposure or an identify', async () => {
    const { amplitude } = fakeAmplitude();
    const ff = await client([amplitudeIntegration(amplitude, { flags: ['checkout-v2'] })]);

    ff.evaluate('checkout-v2');
    ff.evaluate('other-flag');

    expect(amplitude.track).toHaveBeenCalledTimes(1);
    expect(amplitude.track).toHaveBeenCalledWith('$exposure', { flag_key: 'checkout-v2', variant: 'on' });
    expect(amplitude.identify).toHaveBeenCalledTimes(1);
  });

  it('flags predicate: naming conventions work without any pattern syntax', async () => {
    const track = jest.fn();
    const integration = amplitudeIntegration({ track }, { flags: (key) => key.startsWith('exp-') });
    const user = { id: 'user-1' };

    integration({ key: 'exp-pricing', variant: 'b', user });
    integration({ key: 'kill-switch', variant: 'on', user });

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('$exposure', { flag_key: 'exp-pricing', variant: 'b' });
  });

  it('flags: [] sends nothing — an allowlist is an allowlist', async () => {
    const { amplitude } = fakeAmplitude();
    const ff = await client([amplitudeIntegration(amplitude, { flags: [] })]);

    ff.evaluate('checkout-v2');

    expect(amplitude.track).not.toHaveBeenCalled();
    expect(amplitude.identify).not.toHaveBeenCalled();
  });

  it('supports a custom event name', async () => {
    const track = jest.fn();
    const integration = amplitudeIntegration({ track }, { eventName: 'Flag Evaluated' });

    integration({ key: 'checkout-v2', variant: 'on', user: { id: 'user-1' } });

    expect(track).toHaveBeenCalledWith('Flag Evaluated', { flag_key: 'checkout-v2', variant: 'on' });
  });
});

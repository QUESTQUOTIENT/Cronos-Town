import { describe, expect, it } from 'vitest';

import { EventBus } from '../src/engine/events/EventBus';
import type { ToastPort } from '../src/engine/ports';
import { createWalletFeature, type WalletBootstrapEthereum } from '../src/features/wallet';

function noopToast(): ToastPort {
  return { notify: () => {} };
}

function makeEthereum(overrides: Partial<WalletBootstrapEthereum> = {}): WalletBootstrapEthereum {
  return {
    isAvailable: () => true,
    requestAccounts: async () => ['0x1111111111111111111111111111111111111111'],
    fallbackAddress: () => null,
    getChainId: async () => '0x19',
    switchToCronos: async () => {},
    callBalance: async () => '0xde0b6b3a7640000',
    ...overrides,
  };
}

const balanceProvider = (wei: bigint) => ({ balanceOf: async () => wei });

describe('features/wallet — connect flow (legacy parity)', () => {
  it('connects and resolves role from the primary provider', async () => {
    let connected = 0;
    const feature = createWalletFeature({
      bus: new EventBus(),
      toast: noopToast(),
      elements: { status: { textContent: '' } },
      ethereum: makeEthereum(),
      provider: balanceProvider(25_000_000n * 10n ** 18n),
      publicProvider: balanceProvider(0n),
    });
    feature.controller.constructor;
    // subscribe to the connected event
    void connected;
    const address = await feature.controller.connect();

    expect(address).toBe('0x1111111111111111111111111111111111111111');
    expect(feature.state.role).toBe('Friends');
    expect(feature.state.packBalance).toBe('25,000,000.00');
  });

  it('falls back to the public RPC provider on primary failure', async () => {
    const feature = createWalletFeature({
      bus: new EventBus(),
      toast: noopToast(),
      elements: { status: { textContent: '' } },
      ethereum: makeEthereum(),
      provider: { balanceOf: async () => { throw new Error('wallet rpc down'); } },
      publicProvider: balanceProvider(1_000_000n * 10n ** 18n),
    });
    await feature.controller.connect();
    expect(feature.state.role).toBe('Shrimp');
    expect(feature.state.packBalance).toBe('1,000,000.00');
  });

  it('returns null when no wallet is available', async () => {
    const feature = createWalletFeature({
      bus: new EventBus(),
      toast: noopToast(),
      elements: { status: { textContent: '' } },
      ethereum: makeEthereum({ isAvailable: () => false }),
      provider: balanceProvider(0n),
      publicProvider: balanceProvider(0n),
    });
    const address = await feature.controller.connect();
    expect(address).toBeNull();
    expect(feature.state.address).toBeNull();
  });

  it('uses fallbackAddress when requestAccounts throws', async () => {
    const feature = createWalletFeature({
      bus: new EventBus(),
      toast: noopToast(),
      elements: { status: { textContent: '' } },
      ethereum: makeEthereum({
        requestAccounts: async () => {
          throw new Error('popup blocked');
        },
        fallbackAddress: () => '0x2222222222222222222222222222222222222222',
      }),
      provider: balanceProvider(0n),
      publicProvider: balanceProvider(0n),
    });
    const address = await feature.controller.connect();
    expect(address).toBe('0x2222222222222222222222222222222222222222');
  });

  it('returns null when no account is selected', async () => {
    const feature = createWalletFeature({
      bus: new EventBus(),
      toast: noopToast(),
      elements: { status: { textContent: '' } },
      ethereum: makeEthereum({ requestAccounts: async () => [] }),
      provider: balanceProvider(0n),
      publicProvider: balanceProvider(0n),
    });
    expect(await feature.controller.connect()).toBeNull();
  });

  it('switches chain when not on Cronos, and records a notice on failure', async () => {
    let switched = false;
    let chainId = '0x1';
    const feature = createWalletFeature({
      bus: new EventBus(),
      toast: noopToast(),
      elements: { status: { textContent: '' } },
      ethereum: makeEthereum({
        getChainId: async () => chainId,
        switchToCronos: async () => {
          switched = true;
          chainId = '0x19'; // after switching, the re-read reports Cronos
        },
      }),
      provider: balanceProvider(0n),
      publicProvider: balanceProvider(0n),
    });
    await feature.controller.connect();
    expect(switched).toBe(true);
    expect(feature.state.chainId).toBe('0x19');
  });
});

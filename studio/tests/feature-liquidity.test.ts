import { describe, expect, it } from 'vitest';

import { EventBus } from '../src/engine/events/EventBus';
import type { AuditPort, HapticsPort, RpcPort, ToastPort, WalletPort } from '../src/engine/ports';
import { createLiquidityFeature } from '../src/features/liquidity';

function noopAudit(): AuditPort {
  return { record: () => {} };
}
function noopToast(): ToastPort {
  return { notify: () => {} };
}
function noopHaptics(): HapticsPort {
  return { effect: () => {} };
}

function connectedWallet(): WalletPort {
  return { isAvailable: () => true, getAddress: () => '0xabc', connect: async () => '0xabc' };
}
function disconnectedWallet(): WalletPort {
  return { isAvailable: () => false, getAddress: () => null, connect: async () => { throw new Error('none'); } };
}

function fakeRpc(): RpcPort {
  return { sendTransaction: async () => '0xdeadbeef', waitForReceipt: async () => null };
}

function makeBootstrap(overrides: Partial<Parameters<typeof createLiquidityFeature>[0]> = {}) {
  let ids = 10000;
  return {
    bus: new EventBus(),
    wallet: connectedWallet(),
    rpc: fakeRpc(),
    toast: noopToast(),
    audit: noopAudit(),
    haptics: noopHaptics(),
    buildTx: async () => ({ to: '0x145863Eb42Cf62847A6Ca784e6416C1682b1b2Ae', data: '0x', value: '0x0' }),
    nextId: () => ids++,
    ...overrides,
  };
}

describe('features/liquidity — Crolana V3 (legacy parity)', () => {
  it('rejects an invalid price range (min >= max)', async () => {
    const f = createLiquidityFeature(makeBootstrap());
    expect(f.controller.validateRange(60, 60)).toBe(false);
    expect(f.controller.validateRange(70, 60)).toBe(false);
    expect(await f.controller.addLiquidity('CRO', 'PACK', 100, 5000, 70, 60, 0.3)).toBeNull();
  });

  it('blocks add liquidity when no wallet is connected (no simulated fallback)', async () => {
    const f = createLiquidityFeature(makeBootstrap({ wallet: disconnectedWallet() }));
    const pos = await f.controller.addLiquidity('CRO', 'PACK', 100, 5000, 40, 60, 0.3);
    expect(pos).toBeNull();
    expect(f.state.positions).toHaveLength(0);
  });

  it('adds a position on-chain with accrued fees and audit record', async () => {
    const auditCalls: Array<[string, string, number]> = [];
    const audit: AuditPort = { record: (t, d, a) => auditCalls.push([t, d, a]) };
    const f = createLiquidityFeature(makeBootstrap({ audit }));
    // simulate a connected wallet state
    f.state.web3Connected = true;
    f.state.web3Address = '0xabc';

    const pos = await f.controller.addLiquidity('CRO', 'PACK', 100, 5000, 40, 60, 0.3);
    expect(pos).not.toBeNull();
    expect(f.state.positions).toHaveLength(1);
    expect(pos?.txHash).toBe('0xdeadbeef');
    expect(pos?.accruedA).toBe(5); // 100 * 0.05 = 5
    expect(pos?.accruedB).toBe(250); // 5000 * 0.05 = 250
    expect(auditCalls[0][0]).toBe('VVS_V3_LP_MINT');
    expect(auditCalls[0][1]).toContain('CRO/PACK @ 0.3%');
  });

  it('collectFees zeroes accrued amounts', async () => {
    const f = createLiquidityFeature(makeBootstrap());
    f.state.web3Connected = true;
    f.state.web3Address = '0xabc';
    const pos = await f.controller.addLiquidity('CRO', 'PACK', 100, 5000, 40, 60, 0.3);
    expect(pos).not.toBeNull();
    expect(f.controller.collectFees(pos!.id)).toBe(true);
    expect(pos?.accruedA).toBe(0);
    expect(pos?.accruedB).toBe(0);
  });

  it('removePosition removes and audits', async () => {
    const f = createLiquidityFeature(makeBootstrap());
    f.state.web3Connected = true;
    f.state.web3Address = '0xabc';
    const pos = await f.controller.addLiquidity('CRO', 'PACK', 100, 5000, 40, 60, 0.3);
    expect(f.controller.removePosition(pos!.id)).toBe(true);
    expect(f.state.positions).toHaveLength(0);
  });

  it('poolStats uses the live USD price table', () => {
    const f = createLiquidityFeature(makeBootstrap());
    const stats = f.controller.poolStats('CRO', 'PACK', 100, 61200);
    expect(stats.lpReceived).toBeCloseTo(Math.sqrt(100 * 61200), 6);
    expect(stats.tvlUsd).toBe(1420500);
  });
});

/**
 * features/token-launch/types.ts
 *
 * All public types for the Token Launch feature. Behavior is a 1:1 port of the
 * legacy Wolf Street Token Lab (prepare / connect / deploy).
 */

export interface TokenLaunchForm {
  name: string;
  symbol: string;
  supply: number;
  tax: number;
}

export type TokenLaunchStatus =
  | 'idle'
  | 'connecting'
  | 'building'
  | 'signing'
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'failed';

export interface TokenDeployed {
  name: string;
  symbol: string;
  contractAddress: string;
  txHash: string;
}

export interface TokenLaunchState {
  form: TokenLaunchForm;
  walletAddress: string | null;
  status: TokenLaunchStatus;
  lastError: string | null;
  deployed: TokenDeployed | null;
}

/** Shape returned by the backend POST /api/token-launch/build-tx. */
export interface TokenDeployBuild {
  success: boolean;
  chainId: string;
  deployer: string;
  data: string;
  value: string;
  gas: string;
  action: string;
  tokenName: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  transferTaxBps: number;
  description: string;
  error?: string;
}

export interface TokenLaunchElements {
  name: HTMLInputElement | null;
  symbol: HTMLInputElement | null;
  supply: HTMLInputElement | null;
  tax: HTMLSelectElement | null;
  output: HTMLElement | null;
  status: HTMLElement | null;
  deployButton: HTMLButtonElement | null;
}

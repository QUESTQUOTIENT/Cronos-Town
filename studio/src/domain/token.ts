/**
 * domain/token.ts — ERC-20 constructor ABI encoding (pure).
 *
 * TypeScript mirror of `server/rpc.py` (`abi_encode_string`,
 * `abi_encode_token_constructor`) so the deploy calldata can be produced and
 * verified client-side, byte-for-byte identical to the backend output.
 */

/** ABI-encode a dynamic `string` (length word + UTF-8 bytes, zero-padded to 32). */
export function abiEncodeString(word: string): string {
  const data = new TextEncoder().encode(word);
  const length = data.length;
  const pad = (32 - (length % 32)) % 32;
  const lengthWord = length.toString(16).padStart(64, '0');
  const bytesHex = Array.from(data)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const padding = '00'.repeat(pad);
  return lengthWord + bytesHex + padding;
}

/**
 * ABI-encode `constructor(string memory name_, string memory symbol_, uint256 totalSupply_)`.
 * Returns the full "0x"-prefixed dynamic constructor args (offsets + strings).
 */
export function abiEncodeTokenConstructor(name: string, symbol: string, totalSupply: bigint | string): string {
  const nameHex = abiEncodeString(name);
  const symbolHex = abiEncodeString(symbol);
  const headWords = 3;
  const nameOffset = headWords * 32;
  const symbolOffset = nameOffset + nameHex.length / 2;
  const supplyHex = BigInt(totalSupply).toString(16).padStart(64, '0');
  const head = nameOffset.toString(16).padStart(64, '0') + symbolOffset.toString(16).padStart(64, '0') + supplyHex;
  return '0x' + head + nameHex + symbolHex;
}

/** Decimal-supply → 18-decimal wei, exactly (no float drift). */
export function supplyToWei(supply: number | string): bigint {
  const decimals = 18n;
  const factor = 10n ** decimals;
  // Normalize through a string to avoid float imprecision (e.g. 1000000 -> 1e24).
  const normalized = String(supply);
  if (normalized.includes('.') || normalized.includes('e') || normalized.includes('E')) {
    return BigInt(Math.round(parseFloat(normalized) * 1e18));
  }
  return BigInt(normalized) * factor;
}

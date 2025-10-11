import { describe, it, expect } from 'vitest';
import { encodeOpsBase64, decodeBase64Json } from './ops';

describe('ops utils', () => {
  it('encode/decode roundtrip', () => {
    const input = { a: 1, arr: [1, 2, 3], str: 'hello' };
    const b64 = encodeOpsBase64(input);
    const out = decodeBase64Json<typeof input>(b64);
    expect(out).toEqual(input);
  });
});

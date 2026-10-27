/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {writerOpts} from '../changelog-generator/index.js';

describe('changelog-generator', () => {
  it('transforms commits with PR in header and message', () => {
    const transformed = writerOpts.transform({
      type: 'core',
      scope: 'audits',
      header: 'core(audits): fix something (#12345)',
      message: 'fix something (#12345)',
      hash: '1234567890abcdef',
    });

    expect(transformed).toEqual({
      type: 'Core',
      scope: 'audits',
      header: 'core(audits): fix something',
      message: 'fix something',
      hash: '1234567',
      PR: '12345',
    });
  });

  it('handles commits with header: null', () => {
    const transformed = writerOpts.transform({
      type: null,
      header: null,
      hash: '1234567890abcdef',
    });

    expect(transformed).toEqual({
      type: 'Misc',
      header: null,
      hash: '1234567',
    });

    const line = writerOpts.commitPartial({linkReferences: false}, transformed);
    expect(line).toBe('* 1234567');
  });

  it('handles commits with header: null and PR in message', () => {
    const transformed = writerOpts.transform({
      type: 'deps',
      header: null,
      message: 'upgrade foo (#99999)',
      hash: 'abcdef1234567890',
    });

    expect(transformed).toEqual({
      type: 'Deps',
      header: null,
      message: 'upgrade foo',
      hash: 'abcdef1',
      PR: '99999',
    });
  });
});

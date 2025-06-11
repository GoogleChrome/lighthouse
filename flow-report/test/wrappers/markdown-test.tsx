/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {render} from '@testing-library/preact';

import {Markdown} from '../../src/wrappers/markdown';

describe('Markdown', () => {
  it('renders markdown text', () => {
    const root = render(<Markdown text="Some `fancy` text"/>);
    const text = root.getByText(/^Some.*text$/);
    expect(text.innerHTML).toEqual('Some <code>fancy</code> text');
  });
});

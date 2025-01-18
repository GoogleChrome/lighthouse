/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as bakery from '../../../scripts/i18n/bake-ctc-to-lhl.js';

describe('Baking Placeholders', () => {
  it('passthroughs a basic message unchanged', () => {
    const strings = {
      hello: {
        message: 'world',
      },
    };
    const res = bakery.bakePlaceholders(strings);
    expect(res).toEqual({
      hello: {
        message: 'world',
      },
    });
  });

  it('bakes a placeholder into the output string', () => {
    const strings = {
      hello: {
        message: '$MARKDOWN_SNIPPET_0$',
        placeholders: {
          MARKDOWN_SNIPPET_0: {
            content: '`World`',
          },
        },
      },
    };
    const res = bakery.bakePlaceholders(strings);
    expect(res).toStrictEqual({
      hello: {
        message: '`World`',
      },
    });
  });

  it('bakes a placeholder into the output string multiple times', () => {
    const strings = {
      hello: {
        message: '$MARKDOWN_SNIPPET_0$ - $MARKDOWN_SNIPPET_0$',
        placeholders: {
          MARKDOWN_SNIPPET_0: {
            content: '`World`',
          },
        },
      },
    };
    const res = bakery.bakePlaceholders(strings);
    expect(res).toStrictEqual({
      hello: {
        message: '`World` - `World`',
      },
    });
  });

  it('throws when a placeholder cannot be found', () => {
    const strings = {
      hello: {
        message: 'Hello $MARKDOWN_SNIPPET_0$ $MARKDOWN_SNIPPET_1$',
        placeholders: {
          MARKDOWN_SNIPPET_0: {
            content: '`World`',
          },
        },
      },
    };
    // eslint-disable-next-line max-len
    expect(() => bakery.bakePlaceholders(strings)).toThrow(/Message "Hello `World` \$MARKDOWN_SNIPPET_1\$" is missing placeholder\(s\): \$MARKDOWN_SNIPPET_1\$/);
  });

  it('throws when a placeholder is not in string', () => {
    const strings = {
      hello: {
        message: 'World',
        placeholders: {
          MARKDOWN_SNIPPET_0: {
            content: '`World`',
          },
        },
      },
    };
    expect(() => bakery.bakePlaceholders(strings))
      .toThrow(/Provided placeholder "MARKDOWN_SNIPPET_0" not found in message "World"./);
  });
});

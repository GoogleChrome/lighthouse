/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const bakery = require('../../../scripts/i18n/bake-ctc-to-lhl.js');

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

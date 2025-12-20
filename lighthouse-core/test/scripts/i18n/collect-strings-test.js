/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const collect = require('../../../scripts/i18n/collect-strings.js');

function evalJustUIStrings(justUIStrings) {
  return Function(`'use strict'; ${justUIStrings} return UIStrings;`)();
}

describe('parseUIStrings', () => {
  it('collects description', () => {
    const justUIStrings =
    `const UIStrings = {
      /** Description for Hello World. */
      exampleString: 'Hello World',
    };`;
    const liveUIStrings = evalJustUIStrings(justUIStrings);
    const res = collect.parseUIStrings(justUIStrings, liveUIStrings);

    expect(res).toEqual({
      exampleString: {
        message: 'Hello World',
        description: 'Description for Hello World.',
        examples: {},
      },
    });
  });

  it('errors when no description present', () => {
    const justUIStrings =
    `const UIStrings = {
      exampleString: 'Hello World',
      /** ^ no description for this one. */
    };`;
    const liveUIStrings = evalJustUIStrings(justUIStrings);

    expect(() => collect.parseUIStrings(justUIStrings, liveUIStrings))
      .toThrow(/Missing description comment for message "Hello World"/);
  });

  it('errors when description is blank', () => {
    const justUIStrings =
    `const UIStrings = {
      /** */
      exampleString: 'Hello World',
    };`;
    const liveUIStrings = evalJustUIStrings(justUIStrings);

    expect(() => collect.parseUIStrings(justUIStrings, liveUIStrings))
      .toThrow(/Missing description comment for message "Hello World"/);
  });

  it('errors when @description is blank', () => {
    const justUIStrings =
    `const UIStrings = {
      /** 
       * @description
       */
      exampleString: 'Hello World',
    };`;
    const liveUIStrings = evalJustUIStrings(justUIStrings);

    expect(() => collect.parseUIStrings(justUIStrings, liveUIStrings))
      .toThrow(/Empty @description for message "Hello World"/);
  });

  it('collects complex description', () => {
    const justUIStrings =
    `const UIStrings = {
      /** 
       * @description Tagged description for Hello World.
       */
      exampleString: 'Hello World',
    };`;
    const liveUIStrings = evalJustUIStrings(justUIStrings);
    const res = collect.parseUIStrings(justUIStrings, liveUIStrings);

    expect(res).toEqual({
      exampleString: {
        message: 'Hello World',
        description: 'Tagged description for Hello World.',
        examples: {},
      },
    });
  });

  it('collects complex multi-line description', () => {
    const justUIStrings =
    `const UIStrings = {
      /** 
       * @description Tagged description for Hello World,
       *              which is a long, indented(!) description
       */
      exampleString: 'Hello World',
    };`;
    const liveUIStrings = evalJustUIStrings(justUIStrings);
    const res = collect.parseUIStrings(justUIStrings, liveUIStrings);

    expect(res).toEqual({
      exampleString: {
        message: 'Hello World',
        description: 'Tagged description for Hello World, which is a long, indented(!) description',
        examples: {},
      },
    });
  });

  it('collects multi-line description', () => {
    const justUIStrings =
    `const UIStrings = {
      /** 
       * Tagged description for Hello World,
       * which is a long description, that wraps.
       */
      exampleString: 'Hello World',
    };`;
    const liveUIStrings = evalJustUIStrings(justUIStrings);
    const res = collect.parseUIStrings(justUIStrings, liveUIStrings);

    expect(res).toEqual({
      exampleString: {
        message: 'Hello World',
        description: 'Tagged description for Hello World, which is a long description, that wraps.',
        examples: {},
      },
    });
  });

  it('collects complex description with example', () => {
    const justUIStrings =
    `const UIStrings = {
      /** 
       * @description Tagged description for Hello World.
       * @example {Variable example.} variable
       */
      exampleString: 'Hello World {variable}',
    };`;
    const liveUIStrings = evalJustUIStrings(justUIStrings);
    const res = collect.parseUIStrings(justUIStrings, liveUIStrings);

    expect(res).toEqual({
      exampleString: {
        message: 'Hello World {variable}',
        description: 'Tagged description for Hello World.',
        examples: {
          variable: 'Variable example.',
        },
      },
    });
  });

  it('collects complex multi-line description with example', () => {
    const justUIStrings =
    `const UIStrings = {
      /** 
       * @description Tagged description for Hello World,
       *              which is a long, indented(!) {word}
       * @example {description} word
       */
      exampleString: 'Hello World',
    };`;
    const liveUIStrings = evalJustUIStrings(justUIStrings);
    const res = collect.parseUIStrings(justUIStrings, liveUIStrings);

    expect(res).toEqual({
      exampleString: {
        message: 'Hello World',
        description: 'Tagged description for Hello World, which is a long, indented(!) {word}',
        examples: {
          word: 'description',
        },
      },
    });
  });

  it('collects complex description with multiple examples', () => {
    const justUIStrings =
    `const UIStrings = {
      /** 
       * @description Tagged description for Hello World.
       * @example {Variable example.} variable
       * @example {Variable2 example.} variable2
       */
      exampleString: 'Hello World {variable} {variable2}',
    };`;
    const liveUIStrings = evalJustUIStrings(justUIStrings);
    const res = collect.parseUIStrings(justUIStrings, liveUIStrings);

    expect(res).toEqual({
      exampleString: {
        message: 'Hello World {variable} {variable2}',
        description: 'Tagged description for Hello World.',
        examples: {
          variable: 'Variable example.',
          variable2: 'Variable2 example.',
        },
      },
    });
  });

  it('does not throw when no example for ICU', () => {
    const justUIStrings =
    `const UIStrings = {
      /** 
       * @description Tagged description for Hello World.
       */
      exampleString: 'Hello World {variable}',
    };`;
    const liveUIStrings = evalJustUIStrings(justUIStrings);
    const res = collect.parseUIStrings(justUIStrings, liveUIStrings);

    expect(res).toEqual({
      exampleString: {
        message: 'Hello World {variable}',
        description: 'Tagged description for Hello World.',
        examples: {},
      },
    });
  });

  it('throws when @example is blank', () => {
    const justUIStrings =
    `const UIStrings = {
      /** 
       * @description Some description.
       * @example
       */
      exampleString: 'Hello World',
    };`;
    const liveUIStrings = evalJustUIStrings(justUIStrings);

    expect(() => collect.parseUIStrings(justUIStrings, liveUIStrings))
      .toThrow(/Incorrectly formatted @example: ""/);
  });

  it('throws when @example is missing a placeholder name', () => {
    const justUIStrings =
    `const UIStrings = {
      /** 
       * @description Some description.
       * @example {missingPlaceholdername}
       */
      exampleString: 'Hello World',
    };`;
    const liveUIStrings = evalJustUIStrings(justUIStrings);

    expect(() => collect.parseUIStrings(justUIStrings, liveUIStrings))
      .toThrow(/Incorrectly formatted @example: "{missingPlaceholdername}"/);
  });

  it('throws when @example is missing an exampleValue', () => {
    const justUIStrings =
    `const UIStrings = {
      /** 
       * @description Some description.
       * @example placeholderName
       */
      exampleString: 'Hello World',
    };`;
    const liveUIStrings = evalJustUIStrings(justUIStrings);

    expect(() => collect.parseUIStrings(justUIStrings, liveUIStrings))
      .toThrow(/Incorrectly formatted @example/);
  });

  it('throws when an unexpected jsdoc tag is found', () => {
    const justUIStrings =
    `const UIStrings = {
      /**
       * @description Some description.
       * @tutorial For some reason
       */
      exampleString: 'Hello World',
    };`;
    const liveUIStrings = evalJustUIStrings(justUIStrings);

    expect(() => collect.parseUIStrings(justUIStrings, liveUIStrings))
      .toThrow(/Unexpected tagName "@tutorial"/);
  });

  it('parses UIStrings with multiple mixed-jsdoced messages', () => {
    const justUIStrings =
    `const UIStrings = {
      /** 
       * @description A description for Hello World.
       * @example {variable value} variable
       */
      exampleString: 'Hello World {variable}',
      /**
       * A description without an @tag and
       * across multiple lines.
       */
      exampleString2: 'Just a plain string',
      /** 
       * @description Tagged description for Hello World.
       * @example {50} count
       * @example {none of your beeswax} variables
       */
      exampleString3: 'A string with {count, number, milliseconds} of {variables}.',
    };`;
    const liveUIStrings = evalJustUIStrings(justUIStrings);
    const res = collect.parseUIStrings(justUIStrings, liveUIStrings);

    expect(res).toEqual({
      exampleString: {
        message: 'Hello World {variable}',
        description: 'A description for Hello World.',
        examples: {
          variable: 'variable value',
        },
      },
      exampleString2: {
        message: 'Just a plain string',
        description: 'A description without an @tag and across multiple lines.',
        examples: {},
      },
      exampleString3: {
        message: 'A string with {count, number, milliseconds} of {variables}.',
        description: 'Tagged description for Hello World.',
        examples: {
          count: '50',
          variables: 'none of your beeswax',
        },
      },
    });
  });
});

describe('Convert Message to Placeholder', () => {
  it('passthroughs a basic message unchanged', () => {
    const message = 'Hello World.';
    const res = collect.convertMessageToCtc(message);
    expect(res).toEqual({message, placeholders: {}});
  });

  it('passthroughs an ICU plural unchanged', () => {
    const message = '{var, select, male{Hello Mr. Programmer.} ' +
      'female{Hello Ms. Programmer} other{Hello Programmer.}}';
    const res = collect.convertMessageToCtc(message);
    expect(res).toEqual({message, placeholders: {}});
  });

  // TODO(exterkamp): more strict parsing for this case
  it.skip('passthroughs an ICU plural, with commas (Complex ICU parsing test), unchanged', () => {
    const message = '{var, select, male{Hello, Mr, Programmer.} ' +
      'female{Hello, Ms, Programmer} other{Hello, Programmer.}}';
    const res = collect.convertMessageToCtc(message);
    expect(res).toEqual({message, placeholders: {}});
  });

  it('converts code block to placeholder', () => {
    const message = 'Hello `World`.';
    const res = collect.convertMessageToCtc(message);
    const expectation = 'Hello $MARKDOWN_SNIPPET_0$.';
    expect(res.message).toBe(expectation);
    expect(res.placeholders).toEqual({
      MARKDOWN_SNIPPET_0: {
        content: '`World`',
        example: 'World',
      },
    });
  });

  it('numbers code blocks in increasing order', () => {
    const message = '`Hello` `World`.';
    const res = collect.convertMessageToCtc(message);
    const expectation = '$MARKDOWN_SNIPPET_0$ $MARKDOWN_SNIPPET_1$.';
    expect(res.message).toBe(expectation);
    expect(res.placeholders).toEqual({
      MARKDOWN_SNIPPET_0: {
        content: '`Hello`',
        example: 'Hello',
      },
      MARKDOWN_SNIPPET_1: {
        content: '`World`',
        example: 'World',
      },
    });
  });

  it('errors when open backtick', () => {
    const message = '`Hello World.';
    expect(() => collect.convertMessageToCtc(message))
      .toThrow(/Open backtick in message "`Hello World\."/);
  });

  it('allows other markdown in code block', () => {
    const message = 'Hello World `[Link](https://google.com/)`.';
    const res = collect.convertMessageToCtc(message);
    const expectation = 'Hello World $MARKDOWN_SNIPPET_0$.';
    expect(res.message).toBe(expectation);
    expect(res.placeholders).toEqual({
      MARKDOWN_SNIPPET_0: {
        content: '`[Link](https://google.com/)`',
        example: '[Link](https://google.com/)',
      },
    });
  });

  it('converts links to placeholders', () => {
    const message = 'Hello [World](https://google.com/).';
    const res = collect.convertMessageToCtc(message);
    const expectation = 'Hello $LINK_START_0$World$LINK_END_0$.';
    expect(res.message).toBe(expectation);
    expect(res.placeholders).toEqual({
      LINK_START_0: {
        content: '[',
      },
      LINK_END_0: {
        content: '](https://google.com/)',
      },
    });
  });

  describe('catches common link markdown mistakes', () => {
    it('throws on spaces between link text and href blocks', () => {
      const message = 'Hello [World] (https://google.com/).';
      expect(() => collect.convertMessageToCtc(message))
        .toThrow(/Bad Link spacing in message "Hello \[World\] \(https:\/\/google\.com\/\)\."/);
    });

    it('throws on empty link text', () => {
      const message = '[](https://example.com/).';
      expect(() => collect.convertMessageToCtc(message))
        .toThrow(/markdown link text missing in message "\[\]\(https:\/\/example\.com\/\)\."/);
    });
  });

  it('converts custom-formatted ICU to placholders', () => {
    const message = 'Hello World took {timeInMs, number, milliseconds} ms, ' +
      '{timeInSec, number, seconds} s, used {bytes, number, bytes} KB, ' +
      '{perc, number, percent} of {percEx, number, extendedPercent}.';

    const res = collect.convertMessageToCtc(message);
    const expectation = 'Hello World took $CUSTOM_ICU_0$ ms, ' +
    '$CUSTOM_ICU_1$ s, used $CUSTOM_ICU_2$ KB, ' +
    '$CUSTOM_ICU_3$ of $CUSTOM_ICU_4$.';
    expect(res.message).toBe(expectation);
    expect(res.placeholders).toEqual({
      CUSTOM_ICU_0: {
        content: '{timeInMs, number, milliseconds}',
        example: '499',
      },
      CUSTOM_ICU_1: {
        content: '{timeInSec, number, seconds}',
        example: '2.4',
      },
      CUSTOM_ICU_2: {
        content: '{bytes, number, bytes}',
        example: '499',
      },
      CUSTOM_ICU_3: {
        content: '{perc, number, percent}',
        example: '54.6%',
      },
      CUSTOM_ICU_4: {
        content: '{percEx, number, extendedPercent}',
        example: '37.92%',
      },
    });
  });

  it('replaces within ICU plural', () => {
    const message = '{var, select, male{time: {timeInSec, number, seconds}} ' +
      'female{time: {timeInSec, number, seconds}} other{time: {timeInSec, number, seconds}}}';
    const expectation = '{var, select, male{time: $CUSTOM_ICU_0$} ' +
      'female{time: $CUSTOM_ICU_1$} other{time: $CUSTOM_ICU_2$}}';
    const res = collect.convertMessageToCtc(message);
    expect(res.message).toEqual(expectation);
    expect(res.placeholders).toEqual({
      CUSTOM_ICU_0: {
        content: '{timeInSec, number, seconds}',
        example: '2.4',
      },
      CUSTOM_ICU_1: {
        content: '{timeInSec, number, seconds}',
        example: '2.4',
      },
      CUSTOM_ICU_2: {
        content: '{timeInSec, number, seconds}',
        example: '2.4',
      },
    });
  });

  it('errors when using non-supported custom-formatted ICU format', () => {
    const message = 'Hello World took {var, badFormat, milliseconds}.';
    expect(() => collect.convertMessageToCtc(message)).toThrow(
      /Unsupported custom-formatted ICU format var "badFormat" in message "Hello World took "/);
  });

  it('errors when using non-supported custom-formatted ICU type', () => {
    const message = 'Hello World took {var, number, global_int}.';
    expect(() => collect.convertMessageToCtc(message)).toThrow(
      /Unsupported custom-formatted ICU type var "global_int" in message "Hello World took "/);
  });

  it('converts direct ICU with examples to placeholders', () => {
    const message = 'Hello {name}.';
    const res = collect.convertMessageToCtc(message, {name: 'Mary'});
    const expectation = 'Hello $ICU_0$.';
    expect(res.message).toBe(expectation);
    expect(res.placeholders).toEqual({
      ICU_0: {
        content: '{name}',
        example: 'Mary',
      },
    });
  });

  it('errors when example given without variable', () => {
    const message = 'Hello name.';
    expect(() => collect.convertMessageToCtc(message, {name: 'Mary'}))
      // eslint-disable-next-line max-len
      .toThrow(/Example 'name' provided, but has not corresponding ICU replacement in message "Hello name."/);
  });

  it('errors when direct ICU has no examples', () => {
    const message = 'Hello {name}.';
    expect(() => collect.convertMessageToCtc(message)).toThrow(
      /Variable 'name' is missing @example comment in message "Hello {name}\."/);
  });

  it('throws when message contains double dollar', () => {
    const message = 'Hello World$$';
    expect(() => collect.convertMessageToCtc(message)).
      toThrow(/Ctc messages cannot contain double dollar: Hello World\$\$/);
  });

  it('throws when message contains double dollar, less obvious edition', () => {
    const message = 'Hello ${name}';
    expect(() => collect.convertMessageToCtc(message, {name: 'Mary'})).
      toThrow(/Ctc messages cannot contain double dollar: Hello \$\$ICU_0\$/);
  });
});

describe('PseudoLocalizer', () => {
  it('adds cute hats to strings', () => {
    const strings = {
      hello: {
        message: 'world',
      },
    };
    const res = collect.createPsuedoLocaleStrings(strings);
    expect(res).toEqual({
      hello: {
        message: 'ŵór̂ĺd̂',
      },
    });
  });

  it('does not pseudolocalize ICU messages', () => {
    const strings = {
      hello: {
        message: '{world}',
      },
    };
    const res = collect.createPsuedoLocaleStrings(strings);
    expect(res).toEqual({
      hello: {
        message: '{world}',
      },
    });
  });

  it('does not pseudolocalize ordinal ICU message control markers', () => {
    const strings = {
      hello: {
        message: '{num_worlds, plural, =1{world} other{worlds}}',
      },
    };
    const res = collect.createPsuedoLocaleStrings(strings);
    expect(res).toEqual({
      hello: {
        message: '{num_worlds, plural, =1{ŵór̂ĺd̂} other{ẃôŕl̂d́ŝ}}',
      },
    });
  });

  it('does not pseudolocalize placeholders', () => {
    const strings = {
      hello: {
        message: 'Hello $MARKDOWN_SNIPPET_0$',
        placeholders: {
          MARKDOWN_SNIPPET_0: {
            content: '`World`',
            example: 'World',
          },
        },
      },
    };
    const res = collect.createPsuedoLocaleStrings(strings);
    expect(res).toEqual({
      hello: {
        message: 'Ĥél̂ĺô $MARKDOWN_SNIPPET_0$',
        placeholders: {
          MARKDOWN_SNIPPET_0: {
            content: '`World`',
            example: 'World',
          },
        },
      },
    });
  });
});

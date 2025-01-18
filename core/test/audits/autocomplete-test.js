/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import Autocomplete from '../../audits/autocomplete.js';

describe('Best Practices: autocomplete audit', () => {
  it('fails when an there is no autocomplete attribute set', () => {
    const artifacts = {
      Inputs: {
        inputs: [
          {
            id: '',
            name: 'name_cc',
            placeholder: '',
            autocomplete: {
              property: '',
              attribute: null,
              prediction: 'HTML_TYPE_CREDIT_CARD_NAME_FULL',
            },
            node: {
              nodeLabel: 'input',
              snippet: '<input type="text" name="name_cc">'},
          },
          {
            id: '',
            name: 'CCNo',
            placeholder: '',
            autocomplete: {
              property: '',
              attribute: null,
              prediction: 'HTML_TYPE_CREDIT_CARD_NUMBER',
            },
            node: {
              nodeLabel: 'input',
              snippet: '<input type="text" name="CCNo">'},
          },
        ],
        labels: [],
      },
    };
    const expectedItems = [
      {
        'current': '',
        'node': {
          'nodeLabel': 'input',
          'snippet': '<input type="text" name="name_cc">',
          'type': 'node',
        },
        'suggestion': 'cc-name',
      },
      {
        'current': '',
        'node': {
          'nodeLabel': 'input',
          'snippet': '<input type="text" name="CCNo">',
          'type': 'node',
        },
        'suggestion': 'cc-number',
      },
    ];
    const {score, details} = Autocomplete.audit(artifacts);
    expect(score).toBe(0);
    expect(details.items).toMatchObject(expectedItems);
  });

  it('fails when an there is an invalid autocomplete attribute set', () => {
    const artifacts = {
      Inputs: {
        inputs: [
          {
            id: '',
            name: 'name_cc',
            placeholder: '',
            autocomplete: {
              property: '',
              attribute: 'namez',
              prediction: 'UNKNOWN_TYPE',
            },
            node: {
              nodeLabel: 'input',
              snippet: '<input type="text" name="name_cc" autocomplete="namez">'},
          },
          {
            id: '',
            name: 'CCNo',
            placeholder: '',
            autocomplete: {
              property: '',
              attribute: 'ccc-num',
              prediction: 'HTML_TYPE_CREDIT_CARD_NUMBER',
            },
            node: {
              nodeLabel: 'input',
              snippet: '<input type="text" name="CCNo" autocomplete="ccc-num">'},
          },
        ],
        labels: [],
      },
    };
    const {score, details} = Autocomplete.audit(artifacts);
    expect(score).toBe(0);
    expect(details.items).toMatchObject([
      {
        current: 'namez',
        node: {
          type: 'node',
          nodeLabel: 'input',
          snippet: '<input type="text" name="name_cc" autocomplete="namez">',
        },
        suggestion: expect.toBeDisplayString('Requires manual review'),
      },
      {
        current: 'ccc-num',
        node: {
          type: 'node',
          nodeLabel: 'input',
          snippet: '<input type="text" name="CCNo" autocomplete="ccc-num">',
        },
        suggestion: 'cc-number',
      },
    ]);
  });

  it('passes when an there is a valid autocomplete attribute set', () => {
    const artifacts = {
      Inputs: {
        inputs: [
          {
            id: '',
            name: 'name_cc',
            placeholder: '',
            autocomplete: {
              property: 'section-red shipping cc-name',
              attribute: 'section-red shipping cc-name',
              prediction: 'UNKNOWN_TYPE',
            },
            node: {
              nodeLabel: 'textarea',
              // eslint-disable-next-line max-len
              snippet: '<textarea type="text" name="name_cc" autocomplete="section-red shipping cc-name">'},
          },
          {
            id: '',
            name: 'CCNo',
            placeholder: '',
            autocomplete: {
              property: 'cc-number',
              attribute: 'cc-number',
              prediction: 'HTML_TYPE_CREDIT_CARD_NUMBER',
            },
            nodeLabel: 'input',
            snippet: '<input type="text" name="CCNo" autocomplete="cc-number">',
          },
          {
            id: '',
            name: 'mobile-number',
            placeholder: '',
            autocomplete: {
              property: 'section-red shipping mobile tel',
              attribute: 'section-red shipping mobile tel',
              prediction: 'HTML_TYPE_TEL',
            },
            node: {
              nodeLabel: 'input',
              // eslint-disable-next-line max-len
              snippet: '<input name="mobile-number" autocomplete="section-red shipping mobile tel">'},
          },
        ],
        labels: [],
      },
    };
    const {score} = Autocomplete.audit(artifacts);
    expect(score).toBe(1);
  });

  it('not applicable when an there is no autofill prediction and no attribute set', () => {
    const artifacts = {
      Inputs: {
        inputs: [
          {
            id: '',
            name: 'edge_case',
            placeholder: '',
            autocomplete: {
              property: '',
              attribute: null,
              prediction: 'UNKNOWN_TYPE',
            },
            node: {
              nodeLabel: 'textarea',
              snippet: '<textarea type="text" name="edge_case">'},
          },
          {
            id: '',
            name: 'random',
            placeholder: '',
            autocomplete: {
              property: '',
              attribute: null,
              prediction: 'UNKNOWN_TYPE',
            },
            node: {
              nodeLabel: 'input',
              snippet: '<input type="text" name="random">'},
          },
        ],
        labels: [],
      },
    };
    const {notApplicable} = Autocomplete.audit(artifacts);
    expect(notApplicable).toBe(true);
  });

  it('fails when autocomplete is valid but prefix is invalid', () => {
    const artifacts = {
      Inputs: {
        inputs: [
          {
            id: '',
            name: 'name_cc2',
            placeholder: '',
            autocomplete: {
              property: '',
              attribute: 'sectio-red cc-name',
              prediction: 'HTML_TYPE_CREDIT_CARD_NAME_FULL',
            },
            autofillPredict: 'HTML_TYPE_CREDIT_CARD_NAME_FULL',
            node: {
              nodeLabel: 'textarea',
              // eslint-disable-next-line max-len
              snippet: '<textarea type="text" name="name_cc2" autocomplete="sectio-red cc-name">'},
          },
          {
            id: '',
            name: 'CCNo2',
            placeholder: '',
            autocomplete: {
              property: '',
              attribute: 'shippin name',
              prediction: 'NAME_FULL',
            },
            node: {
              nodeLabel: 'input',
              snippet: '<input type="text" name="CCNo2" autocomplete="shippin name">'},
          },
        ],
        labels: [],
      },
    };
    const {score} = Autocomplete.audit(artifacts);
    expect(score).toBe(0);
  });

  it('fails when autocomplete prefix is valid but out of order', () => {
    const artifacts = {
      Inputs: {
        inputs: [
          {
            id: '',
            name: 'name_cc2',
            placeholder: '',
            autocomplete: {
              property: '',
              attribute: 'shipping section-red cc-name',
              prediction: 'HTML_TYPE_CREDIT_CARD_NAME_FULL',
            },
            node: {
              nodeLabel: 'textarea',
              // eslint-disable-next-line max-len
              snippet: '<textarea type="text" name="name_cc2" autocomplete="shipping section-red cc-name">'},
          },
          {
            id: '',
            name: 'CCNo2',
            placeholder: '',
            autocomplete: {
              property: '',
              attribute: 'shipping section-red mobile tel',
              prediction: 'HTML_TYPE_TEL',
            },
            node: {
              nodeLabel: 'input',
              // eslint-disable-next-line max-len
              snippet: '<input type="text" name="CCNo2" autocomplete="shipping section-red mobile tel">'},
          },
        ],
        labels: [],
      },
    };
    const expectedItems = [
      {
        current: 'shipping section-red cc-name',
        node: {
          type: 'node',
          nodeLabel: 'textarea',
          // eslint-disable-next-line max-len
          snippet: '<textarea type="text" name="name_cc2" autocomplete="shipping section-red cc-name">',
        },
        suggestion: 'Review order of tokens',
      },
      {
        current: 'shipping section-red mobile tel',
        node: {
          type: 'node',
          nodeLabel: 'input',
          // eslint-disable-next-line max-len
          snippet: '<input type="text" name="CCNo2" autocomplete="shipping section-red mobile tel">',
        },
        suggestion: 'Review order of tokens',
      },
    ];
    const {score, details} = Autocomplete.audit(artifacts);
    expect(score).toBe(0);
    expect(details.items).toMatchObject(expectedItems);
  });

  it('creates a warning when there is an invalid attribute set', () => {
    const artifacts = {
      Inputs: {
        inputs: [
          {
            id: '',
            name: 'name_cc',
            placeholder: '',
            autocomplete: {
              property: '',
              attribute: 'namez',
              prediction: 'UNKNOWN_TYPE',
            },
            node: {
              nodeLabel: 'input',
              snippet: '<input type="text" name="name_cc" autocomplete="namez">'},
          },
          {
            id: '',
            name: 'CCNo',
            placeholder: '',
            autocomplete: {
              property: '',
              attribute: 'ccc-num',
              prediction: 'HTML_TYPE_CREDIT_CARD_NUMBER',
            },
            node: {
              nodeLabel: 'input',
              snippet: '<input type="text" name="CCNo" autocomplete="ccc-num">'},
          },
        ],
        labels: [],
      },
    };
    const {warnings} = Autocomplete.audit(artifacts);

    expect(warnings).toEqual([
      // eslint-disable-next-line max-len
      expect.toBeDisplayString('`autocomplete` token(s): "namez" is invalid in <input type="text" name="name_cc" autocomplete="namez">'),
      // eslint-disable-next-line max-len
      expect.toBeDisplayString('`autocomplete` token(s): "ccc-num" is invalid in <input type="text" name="CCNo" autocomplete="ccc-num">'),
    ]);
  });

  it('creates a warning when the tokens are valid but out of order', () => {
    const artifacts = {
      Inputs: {
        inputs: [
          {
            id: '',
            name: 'name_cc2',
            placeholder: '',
            autocomplete: {
              property: '',
              attribute: 'shipping section-red cc-name',
              prediction: 'HTML_TYPE_CREDIT_CARD_NAME_FULL',
            },
            node: {
              nodeLabel: 'textarea',
              // eslint-disable-next-line max-len
              snippet: '<textarea type="text" name="name_cc2" autocomplete="shipping section-red cc-name">'},
          },
          {
            id: '',
            name: 'CCNo2',
            placeholder: '',
            autocomplete: {
              property: '',
              attribute: 'shipping section-red mobile tel',
              prediction: 'HTML_TYPE_TEL',
            },
            node: {
              nodeLabel: 'input',
              // eslint-disable-next-line max-len
              snippet: '<input type="text" name="CCNo2" autocomplete="shipping section-red mobile tel">'},
          },
        ],
        labels: [],
      },
    };
    const {warnings} = Autocomplete.audit(artifacts);

    expect(warnings).toEqual([
      // eslint-disable-next-line max-len
      expect.toBeDisplayString('`autocomplete` token(s): "shipping section-red cc-name" is invalid in <textarea type="text" name="name_cc2" autocomplete="shipping section-red cc-name">'),
      // eslint-disable-next-line max-len
      expect.toBeDisplayString('Review order of tokens: "shipping section-red cc-name" in <textarea type="text" name="name_cc2" autocomplete="shipping section-red cc-name">'),
      // eslint-disable-next-line max-len
      expect.toBeDisplayString('`autocomplete` token(s): "shipping section-red mobile tel" is invalid in <input type="text" name="CCNo2" autocomplete="shipping section-red mobile tel">'),
      // eslint-disable-next-line max-len
      expect.toBeDisplayString('Review order of tokens: "shipping section-red mobile tel" in <input type="text" name="CCNo2" autocomplete="shipping section-red mobile tel">'),
    ]);
  });
});

describe('Autocomplete Audit: Check Attribute Validity', () => {
  it('returns false if the attribute is empty', () => {
    const input = {
      id: '',
      name: '',
      placeholder: '',
      autocomplete: {
        property: '',
        attribute: '',
        prediction: '',
      },
      node: {
        nodeLabel: '',
        snippet: ''},
    };
    const output = Autocomplete.checkAttributeValidity(input);
    const expectedOutput = {hasValidTokens: false};
    expect(output).toMatchObject(expectedOutput);
  });

  it('returns true if attribute has optional "section=" token', () => {
    const input = {
      id: '',
      name: '',
      placeholder: '',
      autocomplete: {
        property: 'section-foo name',
        attribute: 'section-foo name',
        prediction: '',
      },
      node: {
        nodeLabel: '',
        snippet: ''},
    };
    const output = Autocomplete.checkAttributeValidity(input);
    const expectedOutput = {hasValidTokens: true, isValidOrder: true};
    expect(output).toMatchObject(expectedOutput);
  });

  it('returns true if all tokens are valid and in order', () => {
    const input = {
      id: '',
      name: '',
      placeholder: '',
      autocomplete: {
        property: 'shipping mobile tel',
        attribute: 'shipping mobile tel',
        prediction: '',
      },
      node: {
        nodeLabel: '',
        snippet: ''},
    };
    const output = Autocomplete.checkAttributeValidity(input);
    const expectedOutput = {hasValidTokens: true, isValidOrder: true};
    expect(output).toMatchObject(expectedOutput);
  });

  it(`returns true for hasValidTokens and false for isValidOrder
      when tokens are valid but out of order`, () => {
    const input = {
      id: '',
      name: '',
      placeholder: '',
      autocomplete: {
        property: '',
        attribute: 'mobile shipping tel',
        prediction: '',
      },
      node: {
        nodeLabel: '',
        snippet: ''},
    };
    const output = Autocomplete.checkAttributeValidity(input);
    const expectedOutput = {hasValidTokens: true, isValidOrder: false};
    expect(output).toMatchObject(expectedOutput);
  });

  it('returns false for invalid tokens', () => {
    const input = {
      id: '',
      name: '',
      placeholder: '',
      autocomplete: {
        property: '',
        attribute: 'invalid-token',
        prediction: '',
      },
      node: {
        nodeLabel: '',
        snippet: ''},
    };
    const output = Autocomplete.checkAttributeValidity(input);
    const expectedOutput = {hasValidTokens: false};
    expect(output).toMatchObject(expectedOutput);
  });
});

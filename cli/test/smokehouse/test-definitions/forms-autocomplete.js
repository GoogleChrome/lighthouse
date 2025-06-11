/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import experimentalConfig from '../../../../core/config/experimental-config.js';

/**
 * @type {LH.Config}
 */
const config = {
  ...experimentalConfig,
  settings: {
    onlyAudits: [
      'autocomplete',
    ],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
  artifacts: {
    Inputs: {
      inputs: [
        {
          parentFormIndex: 0,
          labelIndices: [
            0,
          ],
          id: 'name_cc1',
          name: 'name_cc1',
          type: 'textarea',
          placeholder: 'John Doe',
          autocomplete: {
            property: '',
            attribute: 'sectio-red shipping cc-namez',
            prediction: null,
          },
        },
        {
          parentFormIndex: 0,
          labelIndices: [
            1,
          ],
          id: 'CCNo1',
          name: 'CCNo1',
          type: 'text',
          placeholder: '5555 5555 5555 5555',
          autocomplete: {
            property: 'cc-number',
            attribute: 'cc-number',
            prediction: null,
          },
        },
        {
          parentFormIndex: 0,
          labelIndices: [
            2,
          ],
          id: 'CCExpiresMonth1',
          name: 'CCExpiresMonth1',
          type: 'select-one',
          autocomplete: {
            property: 'cc-exp-month',
            attribute: 'cc-exp-month',
            prediction: null,
          },
        },
        {
          parentFormIndex: 0,
          labelIndices: [],
          id: 'CCExpiresYear1',
          name: '',
          type: 'select-one',
          autocomplete: {
            property: 'section-red billing cc-exp-year',
            attribute: 'section-red billing cc-exp-year',
            prediction: null,
          },
        },
        {
          parentFormIndex: 0,
          labelIndices: [
            3,
          ],
          id: 'cvc1',
          name: 'cvc1',
          type: 'text',
          placeholder: '555',
          autocomplete: {
            property: 'cc-csc',
            attribute: 'cc-csc',
            prediction: null,
          },
        },
        {
          parentFormIndex: 0,
          labelIndices: [],
          id: '',
          name: '',
          type: 'submit',
          placeholder: '',
          autocomplete: {
            property: '',
            attribute: null,
            prediction: null,
          },
        },
        {
          labelIndices: [],
          id: 'fill',
          name: '',
          type: 'button',
          placeholder: '',
          autocomplete: {
            property: '',
            attribute: null,
            prediction: null,
          },
        },
        {
          labelIndices: [
            4,
          ],
          id: 'name_shipping',
          name: '',
          type: 'text',
          placeholder: 'John Doe',
          autocomplete: {
            property: 'name',
            attribute: 'name',
            prediction: null,
          },
        },
        {
          labelIndices: [
            5,
          ],
          id: 'address_shipping',
          name: '',
          type: 'text',
          placeholder: 'Your address',
          autocomplete: {
            property: '',
            attribute: 'shippin street-address',
            prediction: null,
          },
        },
        {
          labelIndices: [
            6,
          ],
          id: 'city_shipping',
          name: '',
          type: 'text',
          placeholder: 'city you live',
          autocomplete: {
            property: '',
            attribute: 'mobile section-red shipping address-level2',
            prediction: null,
          },
        },
        {
          labelIndices: [],
          id: 'state_shipping',
          name: '',
          type: 'select-one',
          autocomplete: {
            property: '',
            attribute: null,
            prediction: null,
          },
        },
        {
          labelIndices: [
            8,
          ],
          id: 'zip_shipping',
          name: '',
          type: 'text',
          placeholder: '',
          autocomplete: {
            property: '',
            attribute: null,
            prediction: null,
          },
        },
        {
          labelIndices: [],
          id: '',
          name: '',
          type: 'button',
          placeholder: '',
          autocomplete: {
            property: '',
            attribute: null,
            prediction: null,
          },
        },
        {
          labelIndices: [
            9,
          ],
          id: 'name_billing',
          name: 'name_billing',
          type: 'text',
          placeholder: 'your name',
          autocomplete: {
            property: '',
            attribute: 'sectio-red billing name',
            prediction: null,
          },
        },
        {
          labelIndices: [
            10,
          ],
          id: 'address_billing',
          name: 'address_billing',
          type: 'text',
          placeholder: 'your address',
          autocomplete: {
            property: 'billing street-address',
            attribute: 'billing street-address',
            prediction: null,
          },
        },
        {
          labelIndices: [
            11,
          ],
          id: 'city_billing',
          name: 'city_billing',
          type: 'text',
          placeholder: 'city you live in',
          autocomplete: {
            property: '',
            attribute: 'section-red shipping ',
            prediction: null,
          },
        },
        {
          labelIndices: [
            12,
          ],
          id: 'state_billing',
          name: 'state_billing',
          type: 'select-one',
          autocomplete: {
            property: '',
            attribute: null,
            prediction: null,
          },
        },
        {
          labelIndices: [
            13,
          ],
          id: 'zip_billing',
          name: '',
          type: 'text',
          placeholder: '',
          autocomplete: {
            property: '',
            attribute: null,
            prediction: null,
          },
        },
        {
          labelIndices: [],
          id: 'submit2',
          name: '',
          type: 'button',
          placeholder: '',
          autocomplete: {
            property: '',
            attribute: null,
            prediction: null,
          },
        },
        {
          labelIndices: [
            14,
          ],
          id: 'name_cc2',
          name: 'name_cc2',
          type: 'textarea',
          placeholder: '',
          autocomplete: {
            property: 'cc-name',
            attribute: 'cc-name',
            prediction: null,
          },
        },
        {
          labelIndices: [
            15,
          ],
          id: 'CCNo2',
          name: 'CCNo2',
          type: 'text',
          placeholder: '',
          autocomplete: {
            property: 'section-red cc-number',
            attribute: 'section-red cc-number',
            prediction: null,
          },
        },
        {
          labelIndices: [
            16,
          ],
          id: 'CCExpiresMonth2',
          name: 'CCExpiresMonth2',
          type: 'select-one',
          autocomplete: {
            property: '',
            attribute: null,
            prediction: null,
          },
        },
        {
          labelIndices: [],
          id: 'CCExpiresYear',
          name: '',
          type: 'select-one',
          autocomplete: {
            property: '',
            attribute: null,
            prediction: null,
          },
        },
        {
          labelIndices: [
            17,
          ],
          id: 'cvc2',
          name: 'cvc2',
          type: 'text',
          placeholder: '',
          autocomplete: {
            property: 'cc-csc',
            attribute: 'cc-csc',
            prediction: null,
          },
        },
        {
          labelIndices: [
            18,
          ],
          id: 'mobile-number',
          name: 'mobile-number',
          type: 'text',
          placeholder: '',
          autocomplete: {
            property: 'section-red shipping mobile tel',
            attribute: 'section-red shipping mobile tel',
            prediction: null,
          },
        },
        {
          labelIndices: [
            19,
          ],
          id: 'random',
          name: 'random',
          type: 'text',
          placeholder: '',
          autocomplete: {
            property: '',
            attribute: null,
            prediction: null,
          },
        },
        {
          labelIndices: [],
          id: 'submit3',
          name: '',
          type: 'button',
          placeholder: '',
          autocomplete: {
            property: '',
            attribute: null,
            prediction: null,
          },
        },
      ],
      forms: [
        {
          id: 'checkout',
          name: 'checkout',
          autocomplete: 'on',
        },
      ],
      labels: [
        {
          for: 'name_cc1',
        },
        {
          for: 'CCNo1',
        },
        {
          for: 'CCExpiresMonth1',
        },
        {
          for: 'cvc1',
        },
        {
          for: 'name_shipping',
        },
        {
          for: 'address_shipping',
        },
        {
          for: 'city_shipping',
        },
        {
          for: 'Sstate_shipping',
        },
        {
          for: 'zip_shipping',
        },
        {
          for: 'name_billing',
        },
        {
          for: 'address_billing',
        },
        {
          for: 'city_billing',
        },
        {
          for: 'state_billing',
        },
        {
          for: 'zip_billing',
        },
        {
          for: 'name_cc2',
        },
        {
          for: 'CCNo2',
        },
        {
          for: 'CCExpiresMonth2',
        },
        {
          for: 'cvc2',
        },
        {
          for: 'mobile-number',
        },
        {
          for: 'random',
        },
      ],
    },
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/form.html',
    finalDisplayedUrl: 'http://localhost:10200/form.html',
    audits: {
    // Requires `--enable-features=AutofillShowTypePredictions`.
    //   autocomplete: {
    //     score: 0,
    //     warnings: [
    //       '`autocomplete` token(s): "sectio-red shipping cc-namez" is invalid in <textarea type="text" id="name_cc1" name="name_cc1" autocomplete="sectio-red shipping cc-namez" placeholder="John Doe">',
    //       '`autocomplete` token(s): "shippin street-address" is invalid in <input type="text" id="address_shipping" autocomplete="shippin street-address" placeholder="Your address">',
    //       '`autocomplete` token(s): "mobile section-red shipping address-level2" is invalid in <input type="text" id="city_shipping" placeholder="city you live" autocomplete="mobile section-red shipping address-level2">',
    //       'Review order of tokens: "mobile section-red shipping address-level2" in <input type="text" id="city_shipping" placeholder="city you live" autocomplete="mobile section-red shipping address-level2">',
    //       '`autocomplete` token(s): "sectio-red billing name" is invalid in <input type="text" id="name_billing" name="name_billing" placeholder="your name" autocomplete="sectio-red billing name">',
    //       '`autocomplete` token(s): "section-red shipping " is invalid in <input type="text" id="city_billing" name="city_billing" placeholder="city you live in" autocomplete="section-red shipping ">',
    //     ],
    //     details: {
    //       items: [
    //         {
    //           node: {
    //             type: 'node',
    //             snippet:
    //               '<textarea type="text" id="name_cc1" name="name_cc1" autocomplete="sectio-red shipping cc-namez" placeholder="John Doe">',
    //             nodeLabel: 'textarea',
    //           },
    //           suggestion: 'Requires manual review',
    //           current: 'sectio-red shipping cc-namez',
    //         },
    //         {
    //           node: {
    //             type: 'node',
    //             snippet:
    //               '<input type="text" id="address_shipping" autocomplete="shippin street-address" placeholder="Your address">',
    //             nodeLabel: 'input',
    //           },
    //           suggestion: 'address-line1',
    //           current: 'shippin street-address',
    //         },
    //         {
    //           node: {
    //             type: 'node',
    //             snippet:
    //               '<input type="text" id="city_shipping" placeholder="city you live" autocomplete="mobile section-red shipping address-level2">',
    //             nodeLabel: 'input',
    //           },
    //           suggestion: 'Review order of tokens',
    //           current: 'mobile section-red shipping address-level2',
    //         },
    //         {
    //           node: {
    //             type: 'node',
    //             snippet: '<select id="state_shipping">',
    //             nodeLabel: 'Select a state\nCA\nMA\nNY\nMD\nOR\nOH\nIL\nDC',
    //           },
    //           suggestion: 'address-level1',
    //           current: '',
    //         },
    //         {
    //           node: {
    //             type: 'node',
    //             snippet: '<input type="text" id="zip_shipping">',
    //             nodeLabel: 'input',
    //           },
    //           suggestion: 'postal-code',
    //           current: '',
    //         },
    //         {
    //           node: {
    //             type: 'node',
    //             snippet:
    //               '<input type="text" id="name_billing" name="name_billing" placeholder="your name" autocomplete="sectio-red billing name">',
    //             nodeLabel: 'input',
    //           },
    //           suggestion: 'name',
    //           current: 'sectio-red billing name',
    //         },
    //         {
    //           node: {
    //             type: 'node',
    //             snippet:
    //               '<input type="text" id="city_billing" name="city_billing" placeholder="city you live in" autocomplete="section-red shipping ">',
    //             nodeLabel: 'input',
    //           },
    //           suggestion: 'Requires manual review',
    //           current: 'section-red shipping ',
    //         },
    //         {
    //           node: {
    //             type: 'node',
    //             snippet: '<select id="state_billing" name="state_billing">',
    //             nodeLabel:
    //               '\n            Select a state\n            CA\n            MA\n            NY\n      …',
    //           },
    //           suggestion: 'address-level1',
    //           current: '',
    //         },
    //         {
    //           node: {
    //             type: 'node',
    //             snippet: '<input type="text" id="zip_billing">',
    //             nodeLabel: 'input',
    //           },
    //           suggestion: 'postal-code',
    //           current: '',
    //         },
    //         {
    //           node: {
    //             type: 'node',
    //             snippet: '<select id="CCExpiresMonth2" name="CCExpiresMonth2">',
    //             nodeLabel: 'MM\n01\n02\n03\n04\n05\n06\n07\n08\n09\n10\n11\n12',
    //           },
    //           suggestion: 'cc-exp-month',
    //           current: '',
    //         },
    //         {
    //           node: {
    //             type: 'node',
    //             snippet: '<select id="CCExpiresYear">',
    //             nodeLabel: 'YY\n2019\n2020\n2021\n2022\n2023\n2024\n2025\n2026\n2027\n2028\n2029',
    //           },
    //           suggestion: 'cc-exp-year',
    //           current: '',
    //         },
    //       ],
    //     },
    //   },
    },
  },
};

export default {
  id: 'forms-autocomplete',
  expectations,
  config,
};

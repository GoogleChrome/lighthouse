/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Config for running accessibility smokehouse audits for axe.
 * @type {LH.Config}
 */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: [
      'accessibility',
    ],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse audit values for byte efficiency tests
 */
const expectations = {
  lhr: {
    requestedUrl: 'http://localhost:10200/a11y/a11y_tester.html',
    finalDisplayedUrl: 'http://localhost:10200/a11y/a11y_tester.html',
    audits: {
      'aria-allowed-attr': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > div#aria-allowed-attr',
                'snippet': '<div id="aria-allowed-attr" role="alert" aria-checked="true">',
                'explanation': 'Fix all of the following:\n  ARIA attribute is not allowed: aria-checked="true"',
                'nodeLabel': 'body > section > div#aria-allowed-attr',
              },
            },
          ],
        },
      },
      'aria-allowed-role': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > aside#aria-allowed-role',
                'snippet': '<aside id="aria-allowed-role" role="doc-foreword">',
                'explanation': 'Fix any of the following:\n  ARIA role doc-foreword is not allowed for given element',
                'nodeLabel': 'body > section > aside#aria-allowed-role',
              },
            },
          ],
        },
      },
      'aria-command-name': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'boundingRect': {
                  'width': '>0',
                  'height': 0,
                },
                'selector': 'body > section > div#aria-command-name',
                'snippet': '<div id="aria-command-name" role="button">',
                'explanation': 'Fix any of the following:\n  Element does not have text that is visible to screen readers\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute',
                'nodeLabel': 'body > section > div#aria-command-name',
              },
            },
          ],
        },
      },
      'aria-conditional-attr': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > input#aria-conditional-attr',
                'snippet': '<input id="aria-conditional-attr" type="checkbox" aria-checked="true">',
                'nodeLabel': 'body > section > input#aria-conditional-attr',
                'explanation': 'Fix all of the following:\n  Remove aria-checked, or set it to "false" to match the real checkbox state',
              },
            },
          ],
        },
      },
      'aria-dialog-name': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'boundingRect': {
                  'width': '>0',
                  'height': 0,
                },
                'selector': 'body > section > div#aria-dialog-name',
                'snippet': '<div role="alertdialog" id="aria-dialog-name" aria-label="">',
                'explanation': 'Fix any of the following:\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute',
                'nodeLabel': 'body > section > div#aria-dialog-name',
              },
            },
          ],
        },
      },
      'aria-deprecated-role': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > div#aria-deprecated-role',
                'snippet': '<div role="directory" id="aria-deprecated-role">',
                'nodeLabel': 'body > section > div#aria-deprecated-role',
                'explanation': 'Fix all of the following:\n  The role used is deprecated: directory',
              },
            },
          ],
        },
      },
      'aria-hidden-body': {
        score: 1,
        details: {
          'type': 'table',
          'headings': [],
          'items': [],
        },
      },
      'aria-hidden-focus': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'boundingRect': {
                  'width': '>0',
                  'height': '>0',
                },
                'selector': 'body > section > div#aria-hidden-focus',
                'snippet': '<div id="aria-hidden-focus" aria-hidden="true">',
                'explanation': 'Fix all of the following:\n  Focusable content should be disabled or be removed from the DOM',
                'nodeLabel': 'Focusable Button',
              },
            },
          ],
        },
      },
      'aria-input-field-name': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'boundingRect': {
                  'width': '>0',
                  'height': '>0',
                },
                'selector': 'body > section > div#aria-input-field-name',
                'snippet': '<div id="aria-input-field-name" role="textbox">',
                'explanation': 'Fix any of the following:\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute',
                'nodeLabel': 'text-in-a-box',
              },
            },
          ],
        },
      },
      'aria-meter-name': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'boundingRect': {
                  'width': '>0',
                  'height': '>0',
                },
                'selector': 'body > section > div#aria-meter-name',
                'snippet': '<div id="aria-meter-name" role="meter">',
                'explanation': 'Fix any of the following:\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute',
                'nodeLabel': 'text-in-a-box',
              },
            },
          ],
        },
      },
      'aria-progressbar-name': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'boundingRect': {
                  'width': '>0',
                  'height': '>0',
                },
                'selector': 'body > section > div#aria-progressbar-name',
                'snippet': '<div id="aria-progressbar-name" role="progressbar">',
                'explanation': 'Fix any of the following:\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute',
                'nodeLabel': 'text-in-a-box',
              },
            },
          ],
        },
      },
      'aria-prohibited-attr': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > div#aria-prohibited-attr',
                'snippet': '<div id="aria-prohibited-attr" role="presentation" aria-label="Label">',
                'nodeLabel': 'Label',
                'explanation': 'Fix all of the following:\n  aria-label attribute cannot be used with role "null".',
              },
            },
          ],
        },
      },
      'aria-treeitem-name': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'boundingRect': {
                  'width': '>0',
                  'height': 0,
                },
                'selector': 'body > section > div > div#aria-treeitem-name',
                'snippet': '<div id="aria-treeitem-name" role="treeitem">',
                'explanation': 'Fix any of the following:\n  Element does not have text that is visible to screen readers\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute',
                'nodeLabel': 'body > section > div > div#aria-treeitem-name',
              },
            },
          ],
        },
      },
      'aria-tooltip-name': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'boundingRect': {
                  'width': '>0',
                  'height': 0,
                },
                'selector': 'body > section > div#aria-tooltip-name',
                'snippet': '<div id="aria-tooltip-name" role="tooltip">',
                'explanation': 'Fix any of the following:\n  Element does not have text that is visible to screen readers\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute',
                'nodeLabel': 'body > section > div#aria-tooltip-name',
              },
            },
          ],
        },
      },
      'aria-required-children': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > div#aria-required-children',
                'snippet': '<div id="aria-required-children" role="list">',
                'explanation': 'Fix any of the following:\n  Required ARIA child role not present: listitem',
                'nodeLabel': 'Item',
              },
            },
          ],
        },
      },
      'aria-required-parent': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > div > div#aria-required-parent',
                'snippet': '<div id="aria-required-parent" role="option">',
                'explanation': 'Fix any of the following:\n  Required ARIA parents role not present: group, listbox',
                'nodeLabel': 'body > section > div > div#aria-required-parent',
              },
            },
          ],
        },
      },
      'aria-roles': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > div',
                'snippet': '<div role="foo">',
                'explanation': 'Fix all of the following:\n  Role must be one of the valid ARIA roles: foo',
                'nodeLabel': 'body > section > div',
              },
            },
          ],
        },
      },
      'aria-text': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > span#aria-text',
                'snippet': '<span role="text" id="aria-text">',
                'explanation': 'Fix any of the following:\n  Element has focusable descendants',
                'nodeLabel': 'Not announced',
              },
            },
          ],
        },
      },
      'aria-toggle-field-name': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > div#aria-required-attr',
                'snippet': '<div id="aria-required-attr" role="checkbox">',
                'explanation': 'Fix any of the following:\n  Element does not have text that is visible to screen readers\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute',
                'nodeLabel': 'body > section > div#aria-required-attr',
              },
            },
            {
              node: {
                'type': 'node',
                'selector': 'body > section > div > div#aria-required-parent',
                'snippet': '<div id="aria-required-parent" role="option">',
                'nodeLabel': 'body > section > div > div#aria-required-parent',
              },
            },
            {
              node: {
                'type': 'node',
                'selector': 'body > section > div#aria-valid-attr',
                'snippet': '<div id="aria-valid-attr" role="checkbox" aria-chked="true">',
                'nodeLabel': 'body > section > div#aria-valid-attr',
              },
            },
            {
              node: {
                'type': 'node',
                'selector': 'body > section > div#aria-valid-attr-value',
                'snippet': '<div id="aria-valid-attr-value" role="checkbox" aria-checked="0">',
                'nodeLabel': 'body > section > div#aria-valid-attr-value',
              },
            },
          ],
        },
      },
      'aria-valid-attr-value': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > div#aria-valid-attr-value',
                'snippet': '<div id="aria-valid-attr-value" role="checkbox" aria-checked="0">',
                'explanation': 'Fix all of the following:\n  Invalid ARIA attribute value: aria-checked="0"',
                'nodeLabel': 'body > section > div#aria-valid-attr-value',
              },
            },
          ],
        },
      },
      'aria-valid-attr': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > div#aria-valid-attr',
                'snippet': '<div id="aria-valid-attr" role="checkbox" aria-chked="true">',
                'explanation': 'Fix any of the following:\n  Invalid ARIA attribute name: aria-chked',
                'nodeLabel': 'body > section > div#aria-valid-attr',
              },
            },
          ],
        },
      },
      'button-name': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > button#button-name',
                'snippet': '<button id="button-name">',
                'explanation': 'Fix any of the following:\n  Element does not have inner text that is visible to screen readers\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute\n  Element does not have an implicit (wrapped) <label>\n  Element does not have an explicit <label>\n  Element\'s default semantics were not overridden with role="none" or role="presentation"',
                'nodeLabel': 'body > section > button#button-name',
              },
            },
          ],
        },
      },
      'bypass': {
        score: null,
        scoreDisplayMode: 'notApplicable',
      },
      'color-contrast': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > div#color-contrast',
                'snippet': '<div id="color-contrast" style="background-color: red; color: pink;">',
                // Default font size is different depending on the platform (e.g. 28.5 on travis, 30.0 on Mac), and the px-converted units may have variable precision, so use \d+.\d+.
                'explanation': /^Fix any of the following:\n {2}Element has insufficient color contrast of 2\.59 \(foreground color: #ffc0cb, background color: #ff0000, font size: \d+.\d+pt \(\d+.\d+px\), font weight: normal\). Expected contrast ratio of 3:1$/,
                'nodeLabel': 'Hello',
              },
            },
          ],
        },
      },
      'definition-list': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > dl#definition-list',
                'snippet': '<dl id="definition-list">',
                'explanation': 'Fix all of the following:\n  dl element has direct children that are not allowed: p',
                'nodeLabel': 'body > section > dl#definition-list',
              },
            },
          ],
        },
      },
      'dlitem': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > div#dlitem > dd',
                'snippet': '<dd>',
                'explanation': 'Fix any of the following:\n  Description list item does not have a <dl> parent element',
                'nodeLabel': 'body > section > div#dlitem > dd',
              },
            },
          ],
        },
      },
      'document-title': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'html',
                'snippet': '<html>',
                'explanation': 'Fix any of the following:\n  Document does not have a non-empty <title> element',
                'nodeLabel': 'html',
              },
            },
          ],

        },
      },
      'duplicate-id-aria': {
        score: 1,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > div#duplicate-id-aria',
                'snippet': '<div id="duplicate-id-aria" class="duplicate-id-aria">',
                'explanation': 'Fix any of the following:\n  Document has multiple elements referenced with ARIA with the same id attribute: duplicate-id-aria',
                'nodeLabel': 'body > section > div#duplicate-id-aria',
              },
              subItems: {
                type: 'subitems',
                items: [
                  {
                    relatedNode: {
                      'type': 'node',
                      'selector': 'body > section > div#duplicate-id-aria > div#duplicate-id-aria',
                      'snippet': '<div id="duplicate-id-aria">',
                      'nodeLabel': 'body > section > div#duplicate-id-aria > div#duplicate-id-aria',
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      'empty-heading': {
        score: 1,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > h1#empty-heading',
                'snippet': '<h1 id="empty-heading">',
                'explanation': 'Fix any of the following:\n  Element does not have text that is visible to screen readers\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute',
                'nodeLabel': 'body > section > h1#empty-heading',
              },
            },
          ],
        },
      },
      'form-field-multiple-labels': {
        score: 1,
        scoreDisplayMode: 'informative',
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > input#form-field-multiple-labels',
                'snippet': '<input type="checkbox" id="form-field-multiple-labels">',
                'explanation': 'Fix all of the following:\n  Multiple label elements is not widely supported in assistive technologies. Ensure the first label contains all necessary information.',
                'nodeLabel': 'body > section > input#form-field-multiple-labels',
              },
              subItems: {
                type: 'subitems',
                items: [
                  {
                    relatedNode: {
                      'type': 'node',
                      'selector': 'body > section > label#label1',
                      'snippet': '<label for="form-field-multiple-labels" id="label1">',
                      'nodeLabel': 'label1',
                    },
                  },
                  {
                    relatedNode: {
                      'type': 'node',
                      'selector': 'body > section > label',
                      'snippet': '<label for="form-field-multiple-labels">',
                      'nodeLabel': 'label2',
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      'frame-title': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > iframe#frame-title',
                'snippet': '<iframe id="frame-title">',
                'explanation': 'Fix any of the following:\n  Element has no title attribute\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element\'s default semantics were not overridden with role="none" or role="presentation"',
                'nodeLabel': 'body > section > iframe#frame-title',
              },
            },
          ],
        },
      },
      'heading-order': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > h3',
                'snippet': '<h3>',
                'explanation': 'Fix any of the following:\n  Heading order invalid',
                'nodeLabel': 'sub-sub-header',
              },
            },
          ],
        },
      },
      'html-has-lang': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'html',
                'snippet': '<html>',
                'explanation': 'Fix any of the following:\n  The <html> element does not have a lang attribute',
                'nodeLabel': 'html',
              },
            },
          ],
        },
      },
      'html-xml-lang-mismatch': {
        score: null,
        scoreDisplayMode: 'notApplicable',
      },
      'identical-links-same-purpose': {
        score: 1,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > a#identical-links-same-purpose-1',
                'snippet': '<a id="identical-links-same-purpose-1" href="https://example.com/" aria-label="a link">',
                'explanation': 'Fix all of the following:\n  Check that links have the same purpose, or are intentionally ambiguous.',
                'nodeLabel': 'a link',
              },
            },
          ],
        },
      },
      'image-alt': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > img#image-alt',
                'snippet': '<img id="image-alt" src="./bogus.jpg">',
                'explanation': 'Fix any of the following:\n  Element does not have an alt attribute\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute\n  Element\'s default semantics were not overridden with role="none" or role="presentation"',
                'nodeLabel': 'body > section > img#image-alt',
              },
            },
          ],
        },
      },
      'image-redundant-alt': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'section > ul > li > img#image-redundant-alt',
                'snippet': '<img id="image-redundant-alt" alt="foo bar">',
                'explanation': 'Fix all of the following:\n  Element contains <img> element with alt text that duplicates existing text',
                'nodeLabel': 'foo bar',
              },
            },
          ],
        },
      },
      'input-button-name': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > form > input#input-button-name',
                'snippet': '<input type="button" id="input-button-name">',
                'explanation': 'Fix any of the following:\n  Element has a value attribute and the value attribute is empty\n  Element has no value attribute\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute\n  Element does not have an implicit (wrapped) <label>\n  Element does not have an explicit <label>\n  Element\'s default semantics were not overridden with role="none" or role="presentation"',
                'nodeLabel': 'body > section > form > input#input-button-name',
              },
            },
          ],
        },
      },
      'input-image-alt': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > input#input-image-alt',
                'snippet': '<input type="image" id="input-image-alt">',
                'explanation': 'Fix any of the following:\n  Element has no alt attribute\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute\n  Element does not have an implicit (wrapped) <label>\n  Element does not have an explicit <label>',
                'nodeLabel': 'body > section > input#input-image-alt',
              },
            },
          ],
        },
      },
      // TODO(paulirish): restore when we stop using --enable-features=AutofillShowTypePredictions
      // See https://github.com/GoogleChrome/lighthouse/pull/11342
      // 'label': {
      //   score: 0,
      //   details: {
      //     items: [
      //       {
      //         node: {
      //           'type': 'node',
      //           'selector': '#label',
      //           'snippet': '<input id="label" type="text">',
      //           'explanation': 'Fix any of the following:\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Form element does not have an implicit (wrapped) <label>\n  Form element does not have an explicit <label>\n  Element has no title attribute or the title attribute is empty',
      //           'nodeLabel': 'input',
      //         },
      //       },
      //     ],
      //   },
      // },
      'label-content-name-mismatch': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > button#label-content-name-mismatch',
                'snippet': '<button id="label-content-name-mismatch" aria-label="foo">',
                'explanation': 'Fix any of the following:\n  Text inside the element is not included in the accessible name',
                'nodeLabel': 'foo bar',
              },
            },
          ],
        },
      },
      'landmark-one-main': {
        score: 1,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'html',
                'snippet': '<html>',
                'explanation': 'Fix all of the following:\n  Document does not have a main landmark',
                'nodeLabel': 'html',
              },
            },
          ],
        },
      },
      'link-in-text-block': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > p > a#link-in-text-block',
                'snippet': '<a style="text-decoration: none; color: blue" href="#" id="link-in-text-block">',
                'explanation': 'Fix any of the following:\n  The link has insufficient color contrast of 2.44:1 with the surrounding text. (Minimum contrast is 3:1, link text: #0000ff, surrounding text: #000000)\n  The link has no styling (such as underline) to distinguish it from the surrounding text',
                'nodeLabel': 'link text ',
              },
            },
          ],
        },
      },
      'link-name': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > a#link-name',
                'snippet': '<a id="link-name" href="google.com">',
                'explanation': 'Fix all of the following:\n  Element is in tab order and does not have accessible text\n\nFix any of the following:\n  Element does not have text that is visible to screen readers\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute',
                'nodeLabel': 'body > section > a#link-name',
              },
            },
          ],
        },
      },
      'list': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > ul#list',
                'snippet': '<ul id="list">',
                'explanation': 'Fix all of the following:\n  List element has direct children that are not allowed: p',
                'nodeLabel': 'body > section > ul#list',
              },
            },
          ],
        },
      },
      'listitem': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > li#listitem',
                'snippet': '<li id="listitem">',
                'explanation': 'Fix any of the following:\n  List item does not have a <ul>, <ol> parent element',
                'nodeLabel': 'body > section > li#listitem',
              },
            },
          ],
        },
      },
      'meta-viewport': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'head > meta',
                'snippet': '<meta name="viewport" content="user-scalable=no, maximum-scale=1.0">',
                'explanation': 'Fix any of the following:\n  user-scalable=no on <meta> tag disables zooming on mobile devices',
                'nodeLabel': 'head > meta',
              },
            },
          ],
        },
      },
      'object-alt': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > object#object-alt',
                'snippet': '<object id="object-alt" data="data:text/html,data">',
                'explanation': 'Fix any of the following:\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute\n  Element\'s default semantics were not overridden with role="none" or role="presentation"',
                'nodeLabel': 'body > section > object#object-alt',
              },
            },
          ],
        },
      },
      'select-name': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > select#select-name',
                'snippet': '<select id="select-name">',
                'explanation': 'Fix any of the following:\n  Element does not have an implicit (wrapped) <label>\n  Element does not have an explicit <label>\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute\n  Element\'s default semantics were not overridden with role="none" or role="presentation"',
                'nodeLabel': 'body > section > select#select-name',
              },
            },
          ],
        },
      },
      'skip-link': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > a#skip-link',
                'snippet': '<a href="#foo" style="position: absolute; margin: -10000px" id="skip-link">',
                'explanation': 'Fix any of the following:\n  No skip link target',
                'nodeLabel': 'foo bar',
              },
            },
          ],
        },
      },
      'tabindex': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > div#tabindex',
                'snippet': '<div id="tabindex" tabindex="10">',
                'explanation': 'Fix any of the following:\n  Element has a tabindex greater than 0',
                'nodeLabel': 'body > section > div#tabindex',
              },
            },
          ],
        },
      },
      'table-duplicate-name': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > table#table-duplicate-name',
                'snippet': '<table id="table-duplicate-name" summary="i\'m a table">',
                'explanation': 'Fix all of the following:\n  Content of summary attribute and <caption> element are identical',
                'nodeLabel': 'i\'m a table\nfoo\tfoo\n',
              },
            },
          ],
        },
      },
      'table-fake-caption': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > table#table-fake-caption',
                'snippet': '<table id="table-fake-caption" role="grid">',
                'explanation': 'Fix all of the following:\n  The first child of the table should be a caption instead of a table cell',
                'nodeLabel': 'FOO\nfoo\tfoo\n',
              },
            },
          ],
        },
      },
      'target-size': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > button#target-size-1',
                'snippet': '<button id="target-size-1">',
                // Exact target size can vary depending on the device.
                'explanation': /^Fix any of the following:\n {2}Target has insufficient size \([0-9.]+px by [0-9.]+px, should be at least 24px by 24px\)\n {2}Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of [0-9.]+px instead of at least 24px\.$/,
                'nodeLabel': '+',
              },
            },
            {
              node: {
                'type': 'node',
                'selector': 'body > section > span#target-size-2',
                'snippet': '<span role="button" tabindex="0" id="target-size-2">',
                // Exact target size can vary depending on the device.
                'explanation': /^Fix any of the following:\n {2}Target has insufficient size \([0-9.]+px by [0-9.]+px, should be at least 24px by 24px\)\n {2}Target has insufficient space to its closest neighbors. Safe clickable space has a diameter of [0-9.]+px instead of at least 24px\.$/,
                'nodeLabel': 'o',
              },
            },
          ],
        },
      },
      'td-has-header': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > table#td-has-header',
                'snippet': '<table id="td-has-header">',
                'explanation': 'Fix all of the following:\n  Some non-empty data cells do not have table headers',
                'nodeLabel': 'FOO\tFOO\tFOO\tFOO\nfoo\tfoo\tfoo\tfoo\nfoo\tfoo\tfoo\tfoo\nfoo\tfoo\tfoo\tfoo',
              },
            },
          ],
        },
      },
      'td-headers-attr': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > table#td-headers-attr',
                'snippet': '<table id="td-headers-attr">',
                'explanation': 'Fix all of the following:\n  The headers attribute is not exclusively used to refer to other cells in the table',
                'nodeLabel': 'FOO\nfoo',
              },
            },
          ],
        },
      },
      'valid-lang': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > p#valid-lang',
                'snippet': '<p id="valid-lang" lang="foo">',
                'explanation': 'Fix all of the following:\n  Value of lang attribute not included in the list of valid languages',
                'nodeLabel': 'foo',
              },
            },
          ],
        },
      },
      'accesskeys': {
        score: 0,
        details: {
          items: [
            {
              node: {
                'type': 'node',
                'selector': 'body > section > button#accesskeys1',
                'snippet': '<button id="accesskeys1" accesskey="s">',
                'explanation': 'Fix all of the following:\n  Document has multiple elements with the same accesskey',
                'nodeLabel': 'Foo',
              },
            },
          ],
        },
      },
    },
  },
};

/** @type {Smokehouse.TestDfn} */
export default {
  id: 'a11y',
  expectations,
  config,
};
